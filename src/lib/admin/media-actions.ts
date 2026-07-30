"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rewriteMediaReferences } from "./media-refs";

const BUCKET = "media";

// Same character set the uploader uses, so renamed files stay URL-safe.
function sanitizeName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/^[.]+/, "")
    .slice(0, 200);
}

function fail(message: string): never {
  redirect(`/admin/media?error=${encodeURIComponent(message)}`);
}

export async function renameMediaFile(path: string, formData: FormData) {
  const nextName = sanitizeName(String(formData.get("name") ?? ""));
  if (!nextName || nextName === path) redirect("/admin/media");

  const supabase = await createClient();
  const publicUrl = (key: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  const oldUrl = publicUrl(path);

  const { error } = await supabase.storage.from(BUCKET).move(path, nextName);
  if (error) {
    fail(
      /exists/i.test(error.message)
        ? `“${nextName}” already exists — pick another name.`
        : error.message,
    );
  }

  // The public URL changes with the object key, so repoint content at it.
  const rewritten = await rewriteMediaReferences(supabase, oldUrl, publicUrl(nextName));

  revalidatePath("/admin/media");
  revalidatePath("/", "layout");
  redirect(`/admin/media?renamed=${encodeURIComponent(nextName)}&refs=${rewritten}`);
}

export async function deleteMediaFile(path: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) fail(error.message);

  revalidatePath("/admin/media");
  revalidatePath("/", "layout");
  redirect("/admin/media?deleted=1");
}
