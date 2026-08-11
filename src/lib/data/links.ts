import { createPublicClient } from "@/lib/supabase/public";
import { parseTileSize } from "@/lib/link-tiles";
import { isSupabaseConfigured } from "./config";
import type { LinkItemRow, LinkPageTab, LinkTileSize } from "@/lib/supabase/types";

export type LinkItem = {
  label: string;
  url: string;
  description: string;
  emoji: string;
  /** Feature image behind the tile — a pasted address or an uploaded file's URL. */
  imageUrl: string;
  /** How much of the bento grid this tile claims. */
  size: LinkTileSize;
  highlight: boolean;
  /** Which tab of the links page this button belongs to. */
  tab: LinkPageTab;
  /** Optional heading this button is grouped under, e.g. "Graphics need". */
  section: string;
};

const placeholderLinks: LinkItem[] = [
  { label: "Custom Design (Email)", url: "/contact", description: "", emoji: "📩", imageUrl: "", size: "wide", highlight: true, tab: "links", section: "Graphics need" },
  { label: "Custom Design (WhatsApp)", url: "/contact", description: "", emoji: "💬", imageUrl: "", size: "small", highlight: false, tab: "links", section: "Graphics need" },
  { label: "Custom Design (Instagram)", url: "https://instagram.com", description: "", emoji: "📷", imageUrl: "", size: "small", highlight: false, tab: "links", section: "Graphics need" },
  { label: "Watch the reel", url: "/dance", description: "The breaking side", emoji: "🎥", imageUrl: "", size: "small", highlight: false, tab: "links", section: "Collaboration" },
  { label: "Selected work", url: "/work", description: "Case studies", emoji: "📁", imageUrl: "", size: "small", highlight: false, tab: "links", section: "Collaboration" },
  { label: "Notes", url: "/blog", description: "Writing on design & motion", emoji: "✍️", imageUrl: "", size: "wide", highlight: false, tab: "links", section: "Collaboration" },
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
      imageUrl: row.image_url ?? "",
      size: parseTileSize(row.size),
      highlight: row.highlight,
      tab: row.tab === "shop" ? "shop" : "links",
      section: row.section ?? "",
    }));
  } catch {
    return placeholderLinks;
  }
}
