import { createPublicClient } from "@/lib/supabase/public";
import { projects as placeholderProjects, type Project } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "./config";
import type { ProjectRow } from "@/lib/supabase/types";

function mapRow(row: ProjectRow): Project {
  return {
    slug: row.slug,
    title: row.title,
    client: row.client ?? "",
    year: row.year ?? "",
    role: row.role ?? "",
    category: row.category ?? "",
    hook: row.hook ?? "",
    template: row.template,
    featured: row.featured,
    cover: row.cover_image ?? "/placeholder/project-01.jpg",
    gallery: row.gallery ?? [],
    narrative: {
      context: row.narrative?.context ?? "",
      move: row.narrative?.move ?? "",
      build: row.narrative?.build ?? "",
      result: row.narrative?.result ?? "",
    },
  };
}

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured) return placeholderProjects;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderProjects;
    return data.map(mapRow);
  } catch {
    return placeholderProjects;
  }
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const all = await getProjects();
  return all.find((p) => p.slug === slug);
}
