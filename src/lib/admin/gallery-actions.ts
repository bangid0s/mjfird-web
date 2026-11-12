"use server";

import { revalidatePath } from "next/cache";
import { HOME_CONTENT_PATHS } from "@/lib/admin/revalidate-paths";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/types";

/** Tags arrive comma- or newline-separated; either way one tag per entry. */
function parseTags(raw: string) {
  return [
    ...new Set(
      raw
        .replace(/,/g, "\n")
        .split("\n")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ticked service checkboxes — one `service_ids` entry per service. */
function parseServiceIds(formData: FormData) {
  return [...new Set(formData.getAll("service_ids").map(String).filter((id) => UUID.test(id)))];
}

function parsePayload(formData: FormData) {
  const testimonialId = String(formData.get("testimonial_id") ?? "");
  return {
    image_url: normalizeMediaUrl(String(formData.get("image_url") ?? "")),
    title: String(formData.get("title") ?? "") || null,
    caption: String(formData.get("caption") ?? "") || null,
    link_url: normalizeMediaUrl(String(formData.get("link_url") ?? "")) || null,
    tags: parseTags(String(formData.get("tags") ?? "")),
    service_ids: parseServiceIds(formData),
    client_name: String(formData.get("client_name") ?? "").trim().slice(0, 80) || null,
    testimonial_id: UUID.test(testimonialId) ? testimonialId : null,
    status: String(formData.get("status") ?? "published") as ContentStatus,
  };
}

/** Service pages, their cards and the home page read gallery images too, so they refresh with it. */
function revalidateGallery() {
  revalidatePath("/admin/gallery");
  for (const path of HOME_CONTENT_PATHS.gallery) revalidatePath(path);
  revalidatePath("/services", "layout");
}

export async function createGalleryItem(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.image_url) return;
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").insert(payload);
  if (error) redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`);
  revalidateGallery();
}

export async function updateGalleryItem(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").update(parsePayload(formData)).eq("id", id);
  if (error) redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`);
  revalidateGallery();
}

export async function deleteGalleryItem(id: string) {
  const supabase = await createClient();
  await supabase.from("gallery_items").delete().eq("id", id);
  revalidateGallery();
}

export async function reorderGalleryItems(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("gallery_items").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidateGallery();
}

export async function updateGalleryPanel(formData: FormData) {
  const payload = {
    gallery_headline: String(formData.get("gallery_headline") ?? "").slice(0, 80),
    gallery_intro: String(formData.get("gallery_intro") ?? ""),
  };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();
  const { error } = existing
    ? await supabase.from("site_settings").update(payload).eq("id", existing.id)
    : await supabase.from("site_settings").insert(payload);

  if (error) redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  redirect("/admin/gallery?saved=1");
}
