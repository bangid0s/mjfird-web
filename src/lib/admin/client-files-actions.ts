"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clientFileName, isSafeClientFilePath, renamedClientFilePath } from "@/lib/commissions/client-files";

const BUCKET = "commissions";
const PAGE = "/admin/media/client";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function fail(message: string): never {
  redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
}

/*
  Storage RLS already lets a client delete their own refs, so without this a
  signed-in client could pull a reference out from under a submitted request.
  These actions are the admin's alone.
*/
async function adminClient(path: string) {
  if (!isSafeClientFilePath(path)) fail("That file path isn't valid.");
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) fail("Only the studio admin can change client files.");
  return supabase;
}

/** Point every request that lists `from` at `to` instead (or drop it when `to` is null). */
async function repointRequests(supabase: Supabase, from: string, to: string | null) {
  let touched = 0;
  for (const column of ["reference_paths", "delivery_paths"] as const) {
    const { data, error } = await supabase.from("commission_requests").select(`id, ${column}`).contains(column, [from]);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as unknown as ({ id: string } & Record<typeof column, string[]>)[]) {
      const next = row[column].flatMap((p) => (p === from ? (to ? [to] : []) : [p]));
      const { error: updateError } = await supabase.from("commission_requests").update({ [column]: next }).eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      touched += 1;
      revalidatePath(`/admin/requests/${row.id}`);
      revalidatePath(`/account/requests/${row.id}`);
    }
  }
  return touched;
}

function refresh() {
  revalidatePath(PAGE);
  revalidatePath("/admin/requests");
  revalidatePath("/account");
}

export async function renameClientFile(path: string, formData: FormData) {
  const supabase = await adminClient(path);
  const nextPath = renamedClientFilePath(path, String(formData.get("name") ?? ""));
  if (!nextPath) redirect(PAGE);

  // The bucket has no UPDATE policy, so rename = copy to the new key,
  // repoint the requests, then remove the old object.
  const { error: copyError } = await supabase.storage.from(BUCKET).copy(path, nextPath);
  if (copyError) {
    fail(/exists/i.test(copyError.message) ? `“${clientFileName(nextPath)}” already exists there — pick another name.` : copyError.message);
  }

  try {
    await repointRequests(supabase, path, nextPath);
  } catch (err) {
    // Roll back the copy so the request keeps pointing at a real file.
    await supabase.storage.from(BUCKET).remove([nextPath]);
    fail(err instanceof Error ? err.message : "Couldn't update the request.");
  }

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
  refresh();
  if (removeError) fail(`Renamed, but the old copy couldn't be removed: ${removeError.message}`);
  redirect(`${PAGE}?renamed=${encodeURIComponent(clientFileName(nextPath))}`);
}

export async function deleteClientFile(path: string) {
  const supabase = await adminClient(path);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) fail(error.message);

  try {
    await repointRequests(supabase, path, null);
  } catch (err) {
    fail(`File deleted, but a request still lists it: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  refresh();
  redirect(`${PAGE}?deleted=1`);
}
