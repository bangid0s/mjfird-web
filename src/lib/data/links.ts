import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { LinkItemRow } from "@/lib/supabase/types";

export type LinkItem = {
  label: string;
  url: string;
  description: string;
  emoji: string;
  highlight: boolean;
};

const placeholderLinks: LinkItem[] = [
  { label: "Start a project", url: "/contact", description: "Brand, motion, or web — tell me what you're building", emoji: "⚡", highlight: true },
  { label: "Watch the reel", url: "/dance", description: "The breaking side", emoji: "🎥", highlight: false },
  { label: "Selected work", url: "/work", description: "Case studies", emoji: "📁", highlight: false },
  { label: "Notes", url: "/blog", description: "Writing on design & motion", emoji: "✍️", highlight: false },
];

export async function getLinkItems(): Promise<LinkItem[]> {
  if (!isSupabaseConfigured) return placeholderLinks;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("link_page_items")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderLinks;
    return (data as LinkItemRow[]).map((row) => ({
      label: row.label,
      url: row.url,
      description: row.description ?? "",
      emoji: row.emoji ?? "",
      highlight: row.highlight,
    }));
  } catch {
    return placeholderLinks;
  }
}
