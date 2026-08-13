import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { GalleryItemRow } from "@/lib/supabase/types";

export type GalleryItem = {
  /** Stable across filtering, so tiles aren't remounted (and images refetched). */
  id: string;
  imageUrl: string;
  title: string;
  caption: string;
  linkUrl: string;
  /** Categories this image is filed under; drives the filter on /gallery. */
  tags: string[];
};

// Nothing to show until the admin pastes some image addresses in — an empty
// gallery renders its own empty state rather than fake tiles.
const placeholderItems: GalleryItem[] = [];

export async function getGalleryItems(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured) return placeholderItems;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data) return placeholderItems;
    return (data as GalleryItemRow[])
      .filter((row) => row.image_url)
      .map((row) => ({
        id: row.id,
        imageUrl: row.image_url,
        title: row.title ?? "",
        caption: row.caption ?? "",
        linkUrl: row.link_url ?? "",
        tags: (row.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
      }));
  } catch {
    return placeholderItems;
  }
}
