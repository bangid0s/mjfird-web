import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { GalleryItemRow } from "@/lib/supabase/types";

export type GalleryItem = {
  imageUrl: string;
  title: string;
  caption: string;
  linkUrl: string;
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
        imageUrl: row.image_url,
        title: row.title ?? "",
        caption: row.caption ?? "",
        linkUrl: row.link_url ?? "",
      }));
  } catch {
    return placeholderItems;
  }
}
