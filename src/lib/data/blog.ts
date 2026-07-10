import { createPublicClient } from "@/lib/supabase/public";
import { posts as placeholderPosts, type Post } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "./config";
import type { BlogPostRow } from "@/lib/supabase/types";

function mapRow(row: BlogPostRow): Post {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    date: row.published_at ?? row.created_at,
    readTime: row.read_time ?? "",
    body: (row.body as string[]) ?? [],
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
