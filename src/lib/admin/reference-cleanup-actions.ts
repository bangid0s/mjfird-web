"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runReferenceCleanup } from "@/lib/commissions/reference-cleanup-run";
import { formatBytes } from "@/lib/commissions/reference-cleanup";

const PAGE = "/admin/media/client";

/** "Clean up now" on Admin → Files: the same run as the daily cron, as the admin. */
export async function cleanUpReferences() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect(`${PAGE}?error=${encodeURIComponent("Only the studio admin can clean up client files.")}`);

  let message: string;
  try {
    const r = await runReferenceCleanup(supabase);
    message =
      r.removed === 0 && r.failed === 0
        ? "Nothing to clean up."
        : `Removed ${r.removed} file${r.removed === 1 ? "" : "s"} (${formatBytes(r.bytes)})` +
          (r.failed ? `. ${r.failed} couldn't be removed: ${r.errors[0] ?? "unknown error"}` : ".");
  } catch (err) {
    redirect(`${PAGE}?error=${encodeURIComponent(err instanceof Error ? err.message : "Cleanup failed.")}`);
  }

  revalidatePath(PAGE);
  revalidatePath("/admin/requests", "layout");
  revalidatePath("/account", "layout");
  redirect(`${PAGE}?cleaned=${encodeURIComponent(message)}`);
}
