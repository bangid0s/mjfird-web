"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus, CaseStudyTemplate } from "@/lib/supabase/types";

function parseGallery(raw: string): { url: string; alt: string }[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item?.url === "string" && item.url)
        .map((item) => ({
          url: normalizeMediaUrl(item.url),
          alt: typeof item.alt === "string" ? item.alt : "",
        }));
    }
  } catch {
    // fall through to empty
  }
  return [];
}

function parseFocalPoint(raw: string) {
  try {
    const point = JSON.parse(raw);
    if (typeof point.x === "number" && typeof point.y === "number") return point;
  } catch {
    // fall through to default
  }
  return { x: 0.5, y: 0.5 };
}

function parsePayload(formData: FormData) {
  const status = String(formData.get("status") ?? "draft") as ContentStatus;
  const scheduledAt = String(formData.get("scheduled_at") ?? "");

  return {
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? ""),
    client: String(formData.get("client") ?? ""),
    year: String(formData.get("year") ?? ""),
    role: String(formData.get("role") ?? ""),
    category: String(formData.get("category") ?? ""),
    hook: String(formData.get("hook") ?? ""),
    template: String(formData.get("template") ?? "editorial") as CaseStudyTemplate,
    cover_image: normalizeMediaUrl(String(formData.get("cover_image") ?? "")) || null,
    cover_focal_point: parseFocalPoint(String(formData.get("cover_focal_point") ?? "")),
    gallery: parseGallery(String(formData.get("gallery") ?? "")),
    narrative: {
      context: String(formData.get("narrative_context") ?? ""),
      move: String(formData.get("narrative_move") ?? ""),
      build: String(formData.get("narrative_build") ?? ""),
      result: String(formData.get("narrative_result") ?? ""),
    },
    featured: formData.get("featured") === "on",
    status,
    scheduled_at: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    published_at: status === "published" ? new Date().toISOString() : null,
  };
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("projects").insert(parsePayload(formData));
  revalidatePath("/admin/projects");
  revalidatePath("/work");
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("projects").update(parsePayload(formData)).eq("id", id);
  revalidatePath("/admin/projects");
  revalidatePath("/work");
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/admin/projects");
  revalidatePath("/work");
  revalidatePath("/");
}

export async function reorderProjects(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("projects").update({ sort_order: index }).eq("id", id)),
  );
  revalidatePath("/admin/projects");
  revalidatePath("/work");
  revalidatePath("/");
}

export async function toggleFeatured(id: string, featured: boolean) {
  const supabase = await createClient();
  await supabase.from("projects").update({ featured }).eq("id", id);
  revalidatePath("/admin/projects");
  revalidatePath("/work");
  revalidatePath("/");
}
