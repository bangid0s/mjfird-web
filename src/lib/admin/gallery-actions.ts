"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/types";
import { GALLERY_SLUG_RE, slugifyGallery, uniqueGallerySlug } from "@/lib/gallery-slug";

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

/** Service pages and cards read gallery images too, so they refresh with it. */
function revalidateGallery() {
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/services", "layout");
}

type Db = Awaited<ReturnType<typeof createClient>>;

/** Slugs other items already use (the unique index would refuse a repeat). */
async function takenSlugs(supabase: Db, exceptId?: string) {
  let q = supabase.from("gallery_items").select("slug").not("slug", "is", null);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data ?? []).map((row) => row.slug as string);
}

export async function createGalleryItem(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.image_url) return;
  const supabase = await createClient();
  const wanted = String(formData.get("slug") ?? "") || payload.title || "";
  const slug = uniqueGallerySlug(wanted, await takenSlugs(supabase));
  const { error } = await supabase.from("gallery_items").insert({ ...payload, slug });
  if (error) redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`);
  revalidateGallery();
}

export async function updateGalleryItem(id: string, formData: FormData) {
  const supabase = await createClient();
  // The page address only changes when the slug field itself is edited, so
  // renaming a piece never breaks a link someone already shared.
  const typed = slugifyGallery(String(formData.get("slug") ?? ""));
  const update: Record<string, unknown> = parsePayload(formData);
  if (typed && GALLERY_SLUG_RE.test(typed)) {
    update.slug = uniqueGallerySlug(typed, await takenSlugs(supabase, id));
  }
  const { error } = await supabase.from("gallery_items").update(update).eq("id", id);
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

/** "orc-bard-character-design-illustration-2.webp" → "Orc Bard Character Design Illustration". */
function titleFromFileName(path: string) {
  const name = path.split("/").pop() ?? "";
  const words = name.replace(/\.[a-z0-9]+$/i, "").replace(/-\d+$/, "").split(/[-_]+/).filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").slice(0, 120);
}

/**
 * Media library → gallery in one click. The new item starts hidden, titled
 * from the file name, so it can be named, tagged and linked to a service
 * before it goes live.
 */
export async function addMediaToGallery(url: string) {
  const image_url = normalizeMediaUrl(url);
  if (!image_url) return;
  const supabase = await createClient();
  const { data: existing } = await supabase.from("gallery_items").select("id").eq("image_url", image_url).limit(1);
  if (existing && existing.length > 0) {
    redirect(`/admin/gallery?error=${encodeURIComponent("That image is already in the gallery.")}`);
  }
  const title = titleFromFileName(image_url) || null;
  const { data: last } = await supabase
    .from("gallery_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("gallery_items").insert({
    image_url,
    title,
    slug: uniqueGallerySlug(title ?? "", await takenSlugs(supabase)),
    status: "draft" as ContentStatus,
    sort_order: (last?.[0]?.sort_order ?? -1) + 1,
  });
  if (error) redirect(`/admin/media?error=${encodeURIComponent(error.message)}`);
  revalidateGallery();
  revalidatePath("/admin/media");
}
