import { normalizeMediaUrl } from "@/lib/media";
import { normalizeGaId } from "@/lib/analytics";
import { parseFaq } from "@/lib/admin/site-settings-columns";

/*
  Site settings live in one row, but the admin edits them a page at a time:
  the homepage's copy on one screen, the About page's on another. Each screen
  posts only its own fields, so a save must only write its own columns. If it
  wrote the whole row, every field missing from that form would be reset to
  its blank default and one save on the Dance page would wipe the homepage.

  This file is the single map of which column belongs to which screen.
*/

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Hero slides: an image plus optional copy that overrides the hero's own
// eyebrow / intro / button for as long as that slide is on screen.
function parseHeroSlides(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item?.url === "string" && item.url)
        .map((item) => ({
          url: normalizeMediaUrl(item.url),
          alt: text(item.alt),
          eyebrow: text(item.eyebrow),
          intro: text(item.intro),
          ctaLabel: text(item.ctaLabel),
          ctaUrl: normalizeMediaUrl(text(item.ctaUrl)),
        }));
    }
  } catch {
    // fall through to empty
  }
  return [];
}

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

/** Every site_settings column the admin can edit, parsed from a submitted form. */
export function buildSettingsPayload(formData: FormData) {
  return {
    accent_color: String(formData.get("accent_color") ?? "#f04e23"),
    site_title: String(formData.get("site_title") ?? ""),
    site_description: String(formData.get("site_description") ?? ""),
    logo_url: String(formData.get("logo_url") ?? "") || null,
    logo_url_light: String(formData.get("logo_url_light") ?? "") || null,
    logo_type: String(formData.get("logo_type") ?? "text"),
    logo_text: String(formData.get("logo_text") ?? "") || "MJFIRD",
    favicon_url: String(formData.get("favicon_url") ?? "") || null,
    // Link preview — see src/lib/social-share.ts for how these become meta tags.
    share_image_mode: String(formData.get("share_image_mode") ?? "auto") === "custom" ? "custom" : "auto",
    share_image_url: normalizeMediaUrl(String(formData.get("share_image_url") ?? "")) || null,
    share_title: String(formData.get("share_title") ?? ""),
    share_description: String(formData.get("share_description") ?? ""),
    share_card_eyebrow: String(formData.get("share_card_eyebrow") ?? ""),
    share_card_headline: String(formData.get("share_card_headline") ?? ""),
    share_card_bg_url: normalizeMediaUrl(String(formData.get("share_card_bg_url") ?? "")) || null,
    share_card_overlay_opacity: Math.min(
      100,
      Math.max(0, Number(formData.get("share_card_overlay_opacity") ?? 55) || 0),
    ),
    share_twitter_handle: String(formData.get("share_twitter_handle") ?? "").trim(),
    ga_measurement_id: normalizeGaId(String(formData.get("ga_measurement_id") ?? "")),
    hero_media_type: String(formData.get("hero_media_type") ?? "none"),
    hero_media_url: normalizeMediaUrl(String(formData.get("hero_media_url") ?? "")) || null,
    hero_media_urls: parseHeroSlides(String(formData.get("hero_media_urls") ?? "[]")),
    hero_animation: String(formData.get("hero_animation") ?? "none"),
    hero_slide_duration: Math.min(
      30,
      Math.max(1, Math.round(Number(formData.get("hero_slide_duration") ?? 5) || 5)),
    ),
    dance_section_eyebrow: String(formData.get("dance_section_eyebrow") ?? ""),
    dance_section_title: String(formData.get("dance_section_title") ?? ""),
    dance_intro: String(formData.get("dance_intro") ?? ""),
    about_description: String(formData.get("about_description") ?? ""),
    links_bg_type: String(formData.get("links_bg_type") ?? "none"),
    links_bg_url: normalizeMediaUrl(String(formData.get("links_bg_url") ?? "")) || null,
    links_overlay_opacity: Math.min(
      100,
      Math.max(0, Number(formData.get("links_overlay_opacity") ?? 70) || 0),
    ),
    hero_overlay_opacity: Math.min(
      100,
      Math.max(0, Number(formData.get("hero_overlay_opacity") ?? 60) || 0),
    ),
    nav_links: parseNavLinks(String(formData.get("nav_links") ?? "")),
    hero_eyebrow: String(formData.get("hero_eyebrow") ?? ""),
    hero_intro: String(formData.get("hero_intro") ?? ""),
    hero_cta_primary: String(formData.get("hero_cta_primary") ?? ""),
    hero_cta_secondary: String(formData.get("hero_cta_secondary") ?? ""),
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
    about_cta_label: String(formData.get("about_cta_label") ?? "").trim(),
    about_cta_url: normalizeMediaUrl(String(formData.get("about_cta_url") ?? "")),
    footer_heading: String(formData.get("footer_heading") ?? ""),
    footer_subtext: String(formData.get("footer_subtext") ?? ""),
    contact_email: String(formData.get("contact_email") ?? ""),
    services_availability_heading: String(formData.get("services_availability_heading") ?? ""),
    services_availability_label: String(formData.get("services_availability_label") ?? ""),
    process_section_eyebrow: String(formData.get("process_section_eyebrow") ?? ""),
    process_section_title: String(formData.get("process_section_title") ?? ""),
    process_steps: parseProcessSteps(String(formData.get("process_steps") ?? "")),
    // Migration 0034 — see OVERHAUL_COLUMNS for what happens before it is applied.
    hero_headline: String(formData.get("hero_headline") ?? "").trim(),
    hero_proof_note: String(formData.get("hero_proof_note") ?? "").trim(),
    services_faq: parseFaq(String(formData.get("services_faq") ?? "")),
    retainer_enabled: formData.get("retainer_enabled") === "on",
    retainer_eyebrow: String(formData.get("retainer_eyebrow") ?? "").trim(),
    retainer_title: String(formData.get("retainer_title") ?? "").trim(),
    retainer_intro: String(formData.get("retainer_intro") ?? "").trim(),
    retainer_points: linesToList(String(formData.get("retainer_points") ?? "")),
    retainer_price_label: String(formData.get("retainer_price_label") ?? "").trim(),
    retainer_cta_label: String(formData.get("retainer_cta_label") ?? "").trim(),
  };
}

export type SettingsColumn = keyof ReturnType<typeof buildSettingsPayload>;

export type SettingsSection = "site" | "home" | "about" | "services" | "dance" | "links-background";

/** The admin screen each group of columns is edited on, and where a save returns to. */
export const SETTINGS_SECTIONS: Record<SettingsSection, { path: string; columns: SettingsColumn[] }> = {
  site: {
    path: "/admin/settings",
    columns: [
      "accent_color", "site_title", "site_description",
      "logo_url", "logo_url_light", "logo_type", "logo_text", "favicon_url",
      "share_image_mode", "share_image_url", "share_title", "share_description",
      "share_card_eyebrow", "share_card_headline", "share_card_bg_url",
      "share_card_overlay_opacity", "share_twitter_handle",
      "ga_measurement_id", "nav_links",
      "footer_heading", "footer_subtext", "contact_email",
    ],
  },
  home: {
    path: "/admin/pages/home",
    columns: [
      "hero_headline", "hero_proof_note", "hero_eyebrow", "hero_intro",
      "hero_media_type", "hero_media_url", "hero_media_urls",
      "hero_animation", "hero_slide_duration", "hero_overlay_opacity",
      "hero_cta_primary", "hero_cta_secondary", "stats",
      "work_section_eyebrow", "work_section_title",
      "services_section_eyebrow", "services_section_title",
      "testimonials_section_eyebrow", "testimonials_section_title",
    ],
  },
  about: {
    path: "/admin/pages/about",
    columns: [
      "about_headline", "about_description", "about_timeline", "about_skills",
      "about_cta_label", "about_cta_url",
    ],
  },
  services: {
    path: "/admin/pages/services",
    columns: [
      "services_availability_heading", "services_availability_label",
      "process_section_eyebrow", "process_section_title", "process_steps", "services_faq",
      "retainer_enabled", "retainer_eyebrow", "retainer_title", "retainer_intro",
      "retainer_points", "retainer_price_label", "retainer_cta_label",
    ],
  },
  dance: {
    path: "/admin/pages/dance",
    columns: ["dance_section_eyebrow", "dance_section_title", "dance_intro"],
  },
  "links-background": {
    path: "/admin/links",
    columns: ["links_bg_type", "links_bg_url", "links_overlay_opacity"],
  },
};

export function isSettingsSection(value: unknown): value is SettingsSection {
  return typeof value === "string" && Object.hasOwn(SETTINGS_SECTIONS, value);
}

/** Only the columns one screen owns, so saving it leaves every other screen's fields alone. */
export function sectionPayload(section: SettingsSection, formData: FormData): Record<string, unknown> {
  const all = buildSettingsPayload(formData) as Record<string, unknown>;
  return Object.fromEntries(SETTINGS_SECTIONS[section].columns.map((column) => [column, all[column]]));
}
