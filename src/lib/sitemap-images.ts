import { isVideoFile, isYouTubeUrl } from "@/lib/media";

/*
  Image URLs for one sitemap entry: absolute https images only (no videos,
  YouTube links or placeholder paths), each listed once, capped well under
  Google's 1,000-per-page limit.
*/
export function sitemapImages(urls: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  for (const url of urls) {
    if (!url || !url.startsWith("https://")) continue;
    if (isVideoFile(url) || isYouTubeUrl(url)) continue;
    seen.add(url);
  }
  return [...seen].slice(0, 100);
}
