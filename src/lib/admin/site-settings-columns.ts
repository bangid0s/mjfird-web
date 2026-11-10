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

export function withoutOverhaulColumns<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const drop = new Set<string>(OVERHAUL_COLUMNS);
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
