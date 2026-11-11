/*
  Hero buttons. The main one leads to /services ("Commission me"), the second
  to /work ("See the work"). Before migration 0040 the pair was "See the work"
  → /work and "Start a project" → /contact; a row still carrying those exact
  original labels is read as the new pair so no label points somewhere it
  doesn't describe. Custom labels pass through untouched.
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
