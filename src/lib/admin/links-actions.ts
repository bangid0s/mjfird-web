"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus, LinkPageTab } from "@/lib/supabase/types";

function parsePayload(formData: FormData) {
  const tab = String(formData.get("tab") ?? "links");
  return {
    label: String(formData.get("label") ?? ""),
    url: normalizeMediaUrl(String(formData.get("url") ?? "")),
    description: String(formData.get("description") ?? "") || null,
    emoji: String(formData.get("emoji") ?? "") || null,
    highlight: formData.get("highlight") === "on",
    tab: (tab === "shop" ? "shop" : "links") as LinkPageTab,
    section: String(formData.get("section") ?? "").trim() || null,
    status: String(formData.get("status") ?? "published") as ContentStatus,
  };
}

export async function createLinkItem(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.label || !payload.url) return;
  const supabase = await createClient();
  await supabase.from("link_page_items").insert(payload);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

export async function updateLinkItem(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("link_page_items").update(parsePayload(formData)).eq("id", id);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

export async function deleteLinkItem(id: string) {
  const supabase = await createClient();
  await supabase.from("link_page_items").delete().eq("id", id);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

function linesToList(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBrands(raw: string) {
  // One brand per line: "Name|logo url|note|link url" — only the name is required.
  return linesToList(raw)
    .map((line) => {
      const [name, logoUrl, note, url] = line.split("|").map((part) => part.trim());
      return {
        name: name ?? "",
        logoUrl: logoUrl ? normalizeMediaUrl(logoUrl) : "",
        note: note ?? "",
        url: url ? normalizeMediaUrl(url) : "",
      };
    })
    .filter((brand) => brand.name);
}

/** "HH:MM", falling back to `fallback` when the browser sends something odd. */
function parseTime(raw: string, fallback: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : fallback;
}

export async function updateLinksStudio(formData: FormData) {
  const days = formData
    .getAll("open_days")
    .map((day) => Number.parseInt(String(day), 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  const slots = Number.parseInt(String(formData.get("links_brand_slots") ?? "3"), 10);

  const payload = {
    links_window_title: String(formData.get("links_window_title") ?? "").slice(0, 80),
    links_headline: String(formData.get("links_headline") ?? "").slice(0, 80),
    links_run_by: String(formData.get("links_run_by") ?? "").slice(0, 80),
    links_intro: String(formData.get("links_intro") ?? ""),
    links_cta_label: String(formData.get("links_cta_label") ?? "") || "Contact Now",
    links_cta_url: normalizeMediaUrl(String(formData.get("links_cta_url") ?? "")) || "/contact",
    links_show_status: formData.get("links_show_status") === "on",
    links_timezone: String(formData.get("links_timezone") ?? "") || "Asia/Jakarta",
    links_open_time: parseTime(String(formData.get("links_open_time") ?? ""), "09:00"),
    links_close_time: parseTime(String(formData.get("links_close_time") ?? ""), "17:00"),
    links_open_days: days.join(","),
    links_brands: parseBrands(String(formData.get("links_brands") ?? "")),
    links_brand_slots: Number.isFinite(slots) ? Math.min(6, Math.max(0, slots)) : 3,
    links_brand_cta_url: normalizeMediaUrl(String(formData.get("links_brand_cta_url") ?? "")),
    links_tags: linesToList(String(formData.get("links_tags") ?? "").replace(/,/g, "\n")),
  };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();
  const { error } = existing
    ? await supabase.from("site_settings").update(payload).eq("id", existing.id)
    : await supabase.from("site_settings").insert(payload);

  if (error) {
    redirect(`/admin/links?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/links");
  revalidatePath("/links");
  redirect("/admin/links?saved=1");
}

export async function reorderLinkItems(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("link_page_items").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/links");
  revalidatePath("/links");
}
