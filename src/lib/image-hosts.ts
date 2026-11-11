// Image hosts that go through Next's image optimizer (resized per device and
// re-encoded as AVIF/WebP). Most artwork on the site is pasted from Behance,
// DeviantArt (wixmp) and the like, where the originals are multi-megabyte
// PNGs — serving those raw was the single biggest cost on every page.
//
// Used in two places that must agree: `images.remotePatterns` in
// next.config.ts (what the optimizer accepts) and `isOptimizable` below (what
// the components route through it). Anything not listed still renders as a
// plain <img>, so pasting a URL from a new host never breaks — it just isn't
// optimized until the host is added here.
//
// `*` matches one subdomain level, `**` any number.
export const OPTIMIZED_IMAGE_HOSTS = [
  "*.supabase.co",
  "mir-s3-cdn-cf.behance.net",
  "**.wixmp.com",
  "media.licdn.com",
  "i.ytimg.com",
  "upload.wikimedia.org",
  "substackcdn.com",
  "i.ibb.co",
  "static.vecteezy.com",
] as const;

function hostMatches(host: string, pattern: string) {
  if (pattern.startsWith("**.")) {
    const base = pattern.slice(3);
    return host.endsWith(`.${base}`);
  }
  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    if (!host.endsWith(`.${base}`)) return false;
    return !host.slice(0, -base.length - 1).includes(".");
  }
  return host === pattern;
}

/** True when `url` is an https image from a host the optimizer accepts. */
export function isOptimizable(url: string) {
  if (!url.startsWith("https://")) return false;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  // GIFs keep their animation only when served as-is, and SVGs are vectors.
  if (/\.(gif|svg)(\?.*)?$/i.test(url)) return false;
  return OPTIMIZED_IMAGE_HOSTS.some((pattern) => hostMatches(host, pattern));
}
