import type { SupabaseClient, User } from "@supabase/supabase-js";
import { OPEN_STATUSES } from "@/lib/commissions/status";

/** What the account header needs on the settings pages: name, email, and the open-request count for the tab. */
export async function accountShellData(supabase: SupabaseClient, user: User) {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("client_profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("commission_requests")
      .select("id", { count: "exact", head: true })
      .eq("client_id", user.id)
      .in("status", OPEN_STATUSES),
  ]);
  return {
    name: (profile?.display_name as string | undefined) || null,
    email: user.email ?? "",
    showPassword: user.app_metadata?.provider !== "google",
    openCount: count ?? 0,
  };
}
