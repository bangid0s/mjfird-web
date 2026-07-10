"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function linesToList(raw: string) {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseStats(raw: string) {
  // One stat per line: "value|suffix|label", e.g. "10|+|Years in the cypher"
  return linesToList(raw)
    .map((line) => {
      const [value, suffix, ...labelParts] = line.split("|").map((s) => s.trim());
      return { value: Number(value) || 0, suffix: suffix ?? "", label: labelParts.join("|") ?? "" };
    })
    .filter((s) => s.label);
}

function parseNavLinks(raw: string) {
  // One link per line: "Label|/path"
  return linesToList(raw)
    .map((line) => {
      const [label, href] = line.split("|").map((s) => s.trim());
      return { label: label ?? "", href: href ?? "" };
    })
    .filter((l) => l.label && l.href.startsWith("/"));
}

function parseProcessSteps(raw: string) {
  // One step per line: "Title|Description"
  return linesToList(raw)
    .map((line) => {
      const [title, ...descParts] = line.split("|").map((s) => s.trim());
      return { title: title ?? "", description: descParts.join("|") ?? "" };
    })
    .filter((s) => s.title);
}

function parseTimeline(raw: string) {
  // One entry per line: "year|label|detail"
  return linesToList(raw)
    .map((line) => {
      const [year, label, ...detailParts] = line.split("|").map((s) => s.trim());
      return { year: year ?? "", label: label ?? "", detail: detailParts.join("|") ?? "" };
    })
    .filter((t) => t.label);
}

export async function saveSiteSettings(formData: FormData) {
  const supabase = await createClient();

  const payload = {
    accent_color: String(formData.get("accent_color") ?? "#ff2e88"),
    site_title: String(formData.get("site_title") ?? ""),
    site_description: String(formData.get("site_description") ?? ""),
    logo_url: String(formData.get("logo_url") ?? "") || null,
    logo_type: String(formData.get("logo_type") ?? "text"),
    logo_text: String(formData.get("logo_text") ?? "") || "MJFIRD",
    hero_media_type: String(formData.get("hero_media_type") ?? "none"),
    hero_media_url: String(formData.get("hero_media_url") ?? "") || null,
    nav_links: parseNavLinks(String(formData.get("nav_links") ?? "")),
    hero_eyebrow: String(formData.get("hero_eyebrow") ?? ""),
    hero_intro: String(formData.get("hero_intro") ?? ""),
    hero_cta_primary: String(formData.get("hero_cta_primary") ?? ""),
    hero_cta_secondary: String(formData.get("hero_cta_secondary") ?? ""),
    marquee_items: linesToList(String(formData.get("marquee_items") ?? "")),
    stats: parseStats(String(formData.get("stats") ?? "")),
    work_section_eyebrow: String(formData.get("work_section_eyebrow") ?? ""),
    work_section_title: String(formData.get("work_section_title") ?? ""),
    services_section_eyebrow: String(formData.get("services_section_eyebrow") ?? ""),
    services_section_title: String(formData.get("services_section_title") ?? ""),
    testimonials_section_eyebrow: String(formData.get("testimonials_section_eyebrow") ?? ""),
    testimonials_section_title: String(formData.get("testimonials_section_title") ?? ""),
    about_headline: String(formData.get("about_headline") ?? ""),
    about_timeline: parseTimeline(String(formData.get("about_timeline") ?? "")),
    about_skills: linesToList(String(formData.get("about_skills") ?? "")),
    footer_heading: String(formData.get("footer_heading") ?? ""),
    footer_subtext: String(formData.get("footer_subtext") ?? ""),
    contact_email: String(formData.get("contact_email") ?? ""),
    services_availability_heading: String(formData.get("services_availability_heading") ?? ""),
    services_availability_label: String(formData.get("services_availability_label") ?? ""),
    process_section_eyebrow: String(formData.get("process_section_eyebrow") ?? ""),
    process_section_title: String(formData.get("process_section_title") ?? ""),
    process_steps: parseProcessSteps(String(formData.get("process_steps") ?? "")),
  };

  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();

  const { error } = existing
    ? await supabase.from("site_settings").update(payload).eq("id", existing.id)
    : await supabase.from("site_settings").insert(payload);

  if (error) {
    // Most common cause: a migration in supabase/migrations hasn't been run yet.
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
