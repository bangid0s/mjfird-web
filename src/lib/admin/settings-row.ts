import { createClient } from "@/lib/supabase/server";
import type { SiteSettingsRow } from "@/lib/supabase/types";

/** The single site_settings row as stored, for the admin's edit screens. */
export async function loadSettingsRow(): Promise<SiteSettingsRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").limit(1).single<SiteSettingsRow>();
  return data;
}

export type SettingsSearchParams = Promise<{ saved?: string; error?: string; pending?: string }>;
