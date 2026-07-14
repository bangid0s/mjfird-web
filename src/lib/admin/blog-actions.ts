"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/types";

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
