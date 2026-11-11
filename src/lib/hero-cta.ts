/*
  Hero buttons. Both the label and the destination of each button are set in
  /admin/pages/home. Blank fields fall back to the defaults below.

  Before migration 0040 the pair was "See the work" → /work and "Start a
  project" → /contact; a row still carrying those exact original labels is
  read as the new pair so no label points somewhere it doesn't describe.
  Custom labels pass through untouched.
*/

export const HERO_PRIMARY_HREF = "/services";
export const HERO_SECONDARY_HREF = "/work";

export const HERO_CTA_DEFAULTS = { primary: "Commission me", secondary: "See the work" } as const;

const LEGACY = { primary: "See the work", secondary: "Start a project" } as const;

export function heroCtaLabels(primary: string | null | undefined, secondary: string | null | undefined) {
  const p = (primary ?? "").trim();
  const s = (secondary ?? "").trim();
  if (p === LEGACY.primary && s === LEGACY.secondary) return { ...HERO_CTA_DEFAULTS };
  return {
    primary: p || HERO_CTA_DEFAULTS.primary,
    secondary: s || HERO_CTA_DEFAULTS.secondary,
  };
}

/**
 * A button destination typed in the admin, made safe to put in an href.
 * Accepts a site path ("/services", "services"), an anchor ("#faq"), a web
 * link (a bare "www.…" gets https://) or a mailto:. Anything else, such as
 * javascript:, becomes "" so the default destination is used instead.
 */
export function normalizeHeroHref(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (raw === "" || /\s/.test(raw) || raw.length > 2000) return "";
  if (raw.startsWith("//")) return "";
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  if (/^https?:\/\/[^/?#\s]+\.[^/?#\s]+/i.test(raw)) return raw;
  if (/^mailto:[^@\s]+@[^@\s]+$/i.test(raw)) return raw;
  if (/^www\.[^/?#\s]+\.[^/?#\s]+/i.test(raw)) return `https://${raw}`;
  // "services" or "work/some-project": a path on this site.
  if (/^[a-z0-9][a-z0-9/_\-.?=&#]*$/i.test(raw) && !raw.includes(":")) return `/${raw}`;
  return "";
}

/** Destination to render: the saved one if it is still safe, else the default. */
export function heroCtaHref(saved: string | null | undefined, fallback: string): string {
  return normalizeHeroHref(saved) || fallback;
}
