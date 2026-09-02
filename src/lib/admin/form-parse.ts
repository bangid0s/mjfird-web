import { normalizeMediaUrl } from "@/lib/media";

/**
 * The JSON payloads the admin's media widgets post back in hidden fields.
 * Both are shared by projects and blog posts, and both are deliberately
 * forgiving: a malformed value falls back to the neutral default rather than
 * failing the save.
 */

/** `GalleryUploader` — an ordered list of images, videos, or YouTube links. */
export function parseGallery(raw: string): { url: string; alt: string }[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item?.url === "string" && item.url)
        .map((item) => ({
          url: normalizeMediaUrl(item.url),
          alt: typeof item.alt === "string" ? item.alt : "",
        }));
    }
  } catch {
    // fall through to empty
  }
  return [];
}

/** `FocalPointPicker` — the point a crop should keep in view. */
export function parseFocalPoint(raw: string) {
  try {
    const point = JSON.parse(raw);
    if (typeof point.x === "number" && typeof point.y === "number") return point;
  } catch {
    // fall through to default
  }
  return { x: 0.5, y: 0.5 };
}
