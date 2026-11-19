import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeClients, type ClientOrder, type ClientProfile, type ClientSummary } from "@/lib/admin/clients";

export const PROFILE_COLUMNS = "id, display_name, email, avatar_url, region, discord, x_handle, social_url, created_at";
export const ORDER_COLUMNS = "id, client_id, status, final_price, estimated_total, created_at";

const PAGE = 1000; // PostgREST's default max rows per request

/** Reads every row, a page at a time, so the list never silently stops at 1,000. */
async function readAll<T>(supabase: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't load ${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

/*
  Admin accounts also get a client_profiles row (the sign-up trigger runs for
  everyone), so they're left out of the list. Before migration 0050 an admin
  can only read their own `admins` row; the signed-in user is excluded either
  way.
*/
async function adminIds(supabase: SupabaseClient) {
  const [{ data }, { data: claims }] = await Promise.all([
    supabase.from("admins").select("user_id"),
    supabase.auth.getClaims(),
  ]);
  const ids = new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id));
  const self = claims?.claims?.sub;
  if (typeof self === "string") ids.add(self);
  return ids;
}

export async function loadClientSummaries(supabase: SupabaseClient): Promise<ClientSummary[]> {
  const [profiles, orders, admins] = await Promise.all([
    readAll<ClientProfile>(supabase, "client_profiles", PROFILE_COLUMNS),
    readAll<ClientOrder>(supabase, "commission_requests", ORDER_COLUMNS),
    adminIds(supabase),
  ]);
  return summarizeClients(profiles, orders, admins);
}
