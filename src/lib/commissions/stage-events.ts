import type { SupabaseClient } from "@supabase/supabase-js";
import { clientFileName } from "@/lib/commissions/client-files";
import type { StageEventRow } from "@/lib/supabase/types";

export type StageEventView = StageEventRow & { previews: { url: string; name: string }[] };

/**
 * A request's stage history, newest last, with signed preview links. Returns
 * [] when the table doesn't exist yet (before 0047), so pages never break.
 */
export async function loadStageEvents(supabase: SupabaseClient, requestId: string): Promise<StageEventView[]> {
  const { data, error } = await supabase
    .from("commission_stage_events")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at");
  if (error || !data) return [];
  const events = data as StageEventRow[];
  const paths = events.flatMap((e) => e.preview_paths ?? []);
  const { data: signed } = paths.length
    ? await supabase.storage.from("commissions").createSignedUrls(paths, 60 * 60)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl]));
  return events.map((e) => ({
    ...e,
    previews: (e.preview_paths ?? []).flatMap((p) => {
      const url = urlByPath.get(p);
      return url ? [{ url, name: clientFileName(p) }] : [];
    }),
  }));
}
