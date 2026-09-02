"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import { parseFocalPoint, parseGallery } from "@/lib/admin/form-parse";
import type { ContentStatus, CoverFit } from "@/lib/supabase/types";

const COVER_FITS: CoverFit[] = ["cover", "contain", "natural", "stretch"];

function parseCoverFit(raw: string): CoverFit {
  return (COVER_FITS as string[]).includes(raw) ? (raw as CoverFit) : "cover";
}

// Measured in the browser when the cover is picked, so treat it as a hint:
// anything unusable is stored as 0 and the cover falls back to sizing itself.
function parseAspect(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function parsePayload(formData: FormData) {
  const status = String(formData.get("status") ?? "draft") as ContentStatus;
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  const publishedAt = String(formData.get("published_at") ?? "");

  return {
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    body: String(formData.get("body") ?? "")
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean),
    cover_image: normalizeMediaUrl(String(formData.get("cover_image") ?? "")) || null,
    cover_fit: parseCoverFit(String(formData.get("cover_fit") ?? "")),
    cover_focal_point: parseFocalPoint(String(formData.get("cover_focal_point") ?? "")),
    cover_aspect: parseAspect(String(formData.get("cover_aspect") ?? "")),
    gallery: parseGallery(String(formData.get("gallery") ?? "")),
    og_image: normalizeMediaUrl(String(formData.get("og_image") ?? "")) || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    read_time: String(formData.get("read_time") ?? ""),
    status,
    scheduled_at: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    // Admin can pick the published date/time; blank falls back to the current moment.
    published_at:
      status === "published"
        ? (publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString())
        : null,
  };
}

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("blog_posts").insert(parsePayload(formData));
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function updatePost(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("blog_posts").update(parsePayload(formData)).eq("id", id);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  await supabase.from("blog_posts").delete().eq("id", id);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}
