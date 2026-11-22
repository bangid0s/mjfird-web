/*
  Public content lives at lowercase addresses (/work/ashoakriver, not
  /work/AshOakriver). Mixed-case slugs from before are sent to the lowercase
  one with a permanent redirect, so old links and Google's index both land on
  a single URL. Only the content sections are touched: auth callbacks and
  admin paths can carry case-sensitive tokens.
*/

const CONTENT_SECTIONS = /^\/(work|blog|gallery|services)\//;

/** The lowercase path to redirect to, or null when the path is already fine. */
export function lowercaseRedirectPath(pathname: string): string | null {
  if (!CONTENT_SECTIONS.test(pathname.toLowerCase())) return null;
  const lower = pathname.toLowerCase();
  return lower === pathname ? null : lower;
}

/** Slugs are stored as typed; the site always uses them lowercased. */
export function canonicalSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
