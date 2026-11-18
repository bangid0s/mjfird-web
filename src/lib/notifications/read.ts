import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Opening a request page clears the bell for that request. Never throws: a
 * missing migration or a hiccup must not break the page.
 */
export async function markRequestNotificationsRead(supabase: SupabaseClient, requestId: string) {
  try {
    await supabase.rpc("mark_notifications_read", { p_ids: null, p_request_id: requestId });
  } catch {
    // ignore
  }
}
