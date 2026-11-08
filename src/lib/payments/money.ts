const MAX_CENTS = 99_999_999_99;

/** Positive USD with at most two decimal places, rendered as `12.50`. */
export function normalizeUsd(value: unknown): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const text = value.toFixed(2);
    if (Number(text) !== value) return null;
    return normalizeUsd(text);
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [whole = "0", frac = ""] = raw.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) return null;
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function usdEqual(left: unknown, right: unknown): boolean {
  const a = normalizeUsd(left);
  return a !== null && a === normalizeUsd(right);
}
