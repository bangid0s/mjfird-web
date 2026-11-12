"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LATE_COLUMNS, lateColumnFallbacks } from "@/lib/admin/site-settings-columns";
import {
  SETTINGS_SECTIONS,
  isSettingsSection,
  sectionPayload,
  type SettingsSection,
} from "@/lib/admin/site-settings-sections";

/**
 * Saves one admin screen's share of the site settings. Bind the section when
 * wiring the form: `action={saveSiteSettings.bind(null, "home")}`.
 */
export async function saveSiteSettings(section: SettingsSection, formData: FormData) {
  // The bound argument travels through the browser, so it is checked like any
  // other input before it picks which columns get written.
  if (!isSettingsSection(section)) redirect("/admin/settings?error=Unknown%20settings%20section");
  const { path } = SETTINGS_SECTIONS[section];
  const supabase = await createClient();
  const payload = sectionPayload(section, formData);

  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();

  const write = (values: Record<string, unknown>) =>
    existing
      ? supabase.from("site_settings").update(values).eq("id", existing.id)
      : supabase.from("site_settings").insert(values);

  let { error } = await write(payload);
  let pendingMigration = false;
  // PGRST204: a column in the payload does not exist yet, i.e. a recent
  // migration has not been applied. Save everything else rather than losing
  // the whole form — and drop as little as possible: only the newest
  // migration's columns first, then the one before, so a database that is one
  // migration behind keeps every field the earlier migrations added.
  const isMissingColumn = (e: typeof error) =>
    Boolean(e) && (e?.code === "PGRST204" || LATE_COLUMNS.some((c) => e?.message.includes(c)));
  if (isMissingColumn(error)) {
    for (const rest of lateColumnFallbacks(payload)) {
      ({ error } = Object.keys(rest).length > 0 ? await write(rest) : { error: null });
      if (!error) pendingMigration = true;
      if (!isMissingColumn(error)) break;
    }
  }

  if (error) {
    // Most common cause: a migration in supabase/migrations hasn't been run yet.
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  // The generated share card is its own route, so redraw it with the new settings.
  revalidatePath("/opengraph-image");
  redirect(pendingMigration ? `${path}?saved=1&pending=0034` : `${path}?saved=1`);
}
