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

/** Every column a save can skip while its migration hasn't been run yet. */
export const LATE_COLUMNS: readonly string[] = [...OVERHAUL_COLUMNS, ...HERO_LINK_COLUMNS];

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
