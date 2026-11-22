import type { GalleryItem } from "@/lib/data/gallery";
import { personRef } from "@/lib/structured-data";

const ARTIST = "M.J. Fird";

/** What the piece is, in a few words: its service, else its first tag. */
function kindOf(item: GalleryItem): string {
  return item.services[0]?.title || item.tags[0] || "Illustration";
}

/** Meta description: the admin's own words, else a plain sentence about the piece. */
export function galleryDescription(item: GalleryItem): string {
  const own = item.caption.replace(/\s+/g, " ").trim();
  if (own) return own.length > 160 ? `${own.slice(0, 157).trimEnd()}…` : own;
  const title = item.title.trim() || "Artwork";
  const forWhom = item.clientName ? `, made for ${item.clientName}` : "";
  return `${title}: ${kindOf(item).toLowerCase()} by ${ARTIST}${forWhom}. Hand-drawn commission work; order something similar.`;
}

/**
 * Other pieces to show under this one: same service first, then a shared tag,
 * then the rest in gallery order. Only items with their own page.
 */
export function relatedItems(item: GalleryItem, all: GalleryItem[], limit = 4): GalleryItem[] {
  const others = all.filter((other) => other.id !== item.id && other.slug);
  const serviceIds = new Set(item.services.map((s) => s.id));
  const score = (other: GalleryItem) =>
    other.services.some((s) => serviceIds.has(s.id)) ? 2 : other.tags.some((t) => item.tags.includes(t)) ? 1 : 0;
  return others
    .map((other, index) => ({ other, index, score: score(other) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ other }) => other);
}

/**
 * schema.org VisualArtwork + its ImageObject. creator, creditText,
 * copyrightNotice, license and acquireLicensePage are what Google Images
 * reads for the "Licensable" badge and the image credit line.
 */
export function galleryJsonLd(item: GalleryItem, siteUrl: string) {
  const pageUrl = `${siteUrl}/gallery/${item.slug}`;
  const creator = personRef;
  const orderPage = item.services[0] ? `${siteUrl}/services/${item.services[0].slug}` : `${siteUrl}/contact`;
  const year = item.publishedAt ? new Date(item.publishedAt).getUTCFullYear() : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: item.title || "Artwork",
    description: galleryDescription(item),
    url: pageUrl,
    artform: kindOf(item),
    creator,
    ...(year && { dateCreated: String(year) }),
    ...(item.tags.length > 0 && { keywords: item.tags.join(", ") }),
    image: {
      "@type": "ImageObject",
      contentUrl: item.imageUrl,
      creator,
      creditText: ARTIST,
      copyrightNotice: `© ${year ?? new Date().getUTCFullYear()} ${ARTIST}`,
      license: `${siteUrl}/terms`,
      acquireLicensePage: orderPage,
    },
  };
}
