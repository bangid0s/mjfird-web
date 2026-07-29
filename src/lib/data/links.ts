import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { LinkItemRow, LinkPageTab } from "@/lib/supabase/types";

export type LinkItem = {
  label: string;
  url: string;
  description: string;
  emoji: string;
  highlight: boolean;
  /** Which tab of the links page this button belongs to. */
  tab: LinkPageTab;
  /** Optional heading this button is grouped under, e.g. "Graphics need". */
  section: string;
};

const placeholderLinks: LinkItem[] = [
  { label: "Custom Design (Email)", url: "/contact", description: "", emoji: "📩", highlight: true, tab: "links", section: "Graphics need" },
  { label: "Custom Design (WhatsApp)", url: "/contact", description: "", emoji: "💬", highlight: false, tab: "links", section: "Graphics need" },
  { label: "Custom Design (Instagram)", url: "https://instagram.com", description: "", emoji: "📷", highlight: false, tab: "links", section: "Graphics need" },
  { label: "Watch the reel", url: "/dance", description: "The breaking side", emoji: "🎥", highlight: false, tab: "links", section: "Collaboration" },
  { label: "Selected work", url: "/work", description: "Case studies", emoji: "📁", highlight: false, tab: "links", section: "Collaboration" },
  { label: "Notes", url: "/blog", description: "Writing on design & motion", emoji: "✍️", highlight: false, tab: "links", section: "Collaboration" },
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
      tab: row.tab === "shop" ? "shop" : "links",
      section: row.section ?? "",
    }));
  } catch {
    return placeholderLinks;
  }
}
