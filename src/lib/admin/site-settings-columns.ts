/** Columns added by migration 0034. Saving must still work before it is applied. */
export const OVERHAUL_COLUMNS = [
  "hero_headline",
  "hero_proof_note",
  "services_faq",
  "retainer_enabled",
  "retainer_eyebrow",
  "retainer_title",
  "retainer_intro",
  "retainer_points",
  "retainer_price_label",
  "retainer_cta_label",
] as const;

/** Hero button destinations. Added by migration 0041. */
export const HERO_LINK_COLUMNS = ["hero_cta_primary_url", "hero_cta_secondary_url"] as const;

/** Which home page hero is shown. Added by migration 0042. */
export const HERO_STYLE_COLUMNS = ["hero_style"] as const;

/** Every column a save can skip while its migration hasn't been run yet. */
export const LATE_COLUMNS: readonly string[] = [...OVERHAUL_COLUMNS, ...HERO_LINK_COLUMNS, ...HERO_STYLE_COLUMNS];

/** The same columns grouped by the migration that adds them, newest migration first. */
export const LATE_COLUMN_GROUPS: readonly (readonly string[])[] = [
  HERO_STYLE_COLUMNS,
  HERO_LINK_COLUMNS,
  OVERHAUL_COLUMNS,
];

/**
 * What to retry with, in order, when a save hits a column that doesn't exist
 * yet. Each step drops one more migration's columns, newest first, so a
 * database missing only the latest migration still saves everything the
 * earlier ones added. Steps that would drop nothing from this payload are
 * skipped. Migrations are applied in order, so the newest are the ones that
 * can be missing.
 */
export function lateColumnFallbacks<T extends Record<string, unknown>>(payload: T): Partial<T>[] {
  const steps: Partial<T>[] = [];
  const drop = new Set<string>();
  let kept = Object.keys(payload).length;
  for (const group of LATE_COLUMN_GROUPS) {
    for (const column of group) drop.add(column);
    const next = Object.fromEntries(Object.entries(payload).filter(([key]) => !drop.has(key))) as Partial<T>;
    const size = Object.keys(next).length;
    if (size === kept) continue;
    kept = size;
    steps.push(next);
  }
  return steps;
}

export function withoutOverhaulColumns<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const drop = new Set<string>(LATE_COLUMNS);
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !drop.has(key))) as Partial<T>;
}

/** One question per line: "Question|Answer". */
export function parseFaq(raw: string): { q: string; a: string }[] {
  return raw
    .split("\n")
    .map((line) => {
      const [q, ...rest] = line.split("|");
      return { q: (q ?? "").trim(), a: rest.join("|").trim() };
    })
    .filter((item) => item.q && item.a);
}
