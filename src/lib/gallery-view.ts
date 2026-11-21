import type { GalleryItem } from "@/lib/data/gallery";

/*
  Display rules for the gallery cards and the detail panel. Pure functions so
  the choices (what a card is called, what earns the badge) are tested.
*/

/**
 * The line under a card. Most images have no title of their own, so they fall
 * back to the commission they are a sample of ("DnD Character Illustrations"),
 * then to their first tag ("Graphic Design"). Pass `serviceFallback: false` on
 * a service's own page, where every card would repeat the same name.
 */
export function cardLabel(item: GalleryItem, serviceFallback = true): string {
  const own = item.title.trim();
  if (own || !serviceFallback) return own;
  return item.services[0]?.title ?? item.tags[0] ?? "";
}

/**
 * Real client work: made for a named client or carrying their review. Only
 * these get the "Commission" badge. Being filed under a service just means
 * "this is the kind of thing that service makes", which is nearly every image.
 */
export function isClientWork(item: GalleryItem): boolean {
  return Boolean(item.review || item.clientName.trim());
}

function parse(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Nov 2026" — the date beside a review's stars. */
export function monthYear(iso: string | undefined): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : "";
}

/** "Nov 10, 2026" — the "Published" line in the detail panel. */
export function fullDate(iso: string | undefined): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
}

/**
 * A service page leads with its cover, then its samples. When the cover is
 * also one of the samples, that sample becomes the cover (keeping its review
 * and client) and leaves the grid, so the image never shows twice.
 */
export function withCoverFirst(
  items: GalleryItem[],
  cover: { url: string; alt: string } | undefined,
): { coverItem: GalleryItem | null; rest: GalleryItem[] } {
  const url = cover?.url.trim();
  if (!url) return { coverItem: null, rest: items };
  const match = items.find((item) => item.imageUrl === url);
  if (match) {
    return { coverItem: { ...match, title: match.title || cover!.alt }, rest: items.filter((item) => item !== match) };
  }
  return {
    coverItem: { id: "service-cover", imageUrl: url, title: cover!.alt, caption: "", linkUrl: "", tags: [], services: [], clientName: "" },
    rest: items,
  };
}
