// Canonical site origin, used in metadata, sitemap, RSS, and structured data.
// Set NEXT_PUBLIC_SITE_URL (no trailing slash) in production, e.g. on Vercel.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mjfird.com").replace(
  /\/$/,
  "",
);

export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
