import { createPublicClient } from "@/lib/supabase/public";
import { posts as placeholderPosts, type Post } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "./config";
import type { BlogPostRow, CoverFit } from "@/lib/supabase/types";

const COVER_FITS: CoverFit[] = ["cover", "contain", "natural", "stretch"];

// The media columns arrived in migration 0023, so a database that has not run
// it yet hands back rows without them — every read below falls back rather
// than assuming the column is there.
function mapRow(row: BlogPostRow): Post {
  const fit = row.cover_fit;
  const point = row.cover_focal_point;

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    date: row.published_at ?? row.created_at,
    readTime: row.read_time ?? "",
    body: (row.body as string[]) ?? [],
    cover: row.cover_image ?? undefined,
    coverFit: COVER_FITS.includes(fit) ? fit : "cover",
    coverFocalPoint:
      point && typeof point.x === "number" && typeof point.y === "number" ? point : undefined,
    coverAspect: typeof row.cover_aspect === "number" ? row.cover_aspect : 0,
    gallery: Array.isArray(row.gallery) ? row.gallery.filter((item) => item?.url) : [],
    ogImage: row.og_image ?? undefined,
  };
}

export async function getPosts(): Promise<Post[]> {
  if (!isSupabaseConfigured) return placeholderPosts;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error || !data || data.length === 0) return placeholderPosts;
    return data.map(mapRow);
  } catch {
    return placeholderPosts;
  }
}

export async function getPost(slug: string): Promise<Post | undefined> {
  const all = await getPosts();
  return all.find((p) => p.slug === slug);
}
