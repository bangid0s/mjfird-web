/*
  Address of a gallery image's own page: /gallery/<slug>. Same rule as the
  0054 backfill (lowercase, runs of anything else become "-"), so a slug made
  here and one made by the migration look alike.
*/

export const GALLERY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyGallery(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/**
 * A slug not in `taken`: the wanted one, else wanted-2, wanted-3…
 * `wanted` falls back to "artwork" when the text has no letters or digits.
 */
export function uniqueGallerySlug(wanted: string, taken: Iterable<string>): string {
  const base = slugifyGallery(wanted) || "artwork";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
