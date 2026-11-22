/*
  The studio's monthly commission capacity as a visitor reads it. Months are
  counted in Western Indonesia Time, where the studio works.
*/

const TZ = "Asia/Jakarta";

export type SlotState =
  | { kind: "unlimited" }
  | { kind: "open"; left: number; total: number; month: string }
  | { kind: "full"; total: number; reopens: string };

export function slotState(counts: { total: number | null; taken: number } | null, now = new Date()): SlotState {
  if (!counts || counts.total === null) return { kind: "unlimited" };
  const left = Math.max(0, counts.total - counts.taken);
  const month = now.toLocaleDateString("en-US", { month: "long", timeZone: TZ });
  if (left > 0) return { kind: "open", left, total: counts.total, month };
  // The 1st of next month, in studio time.
  const [y, m] = now.toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number);
  const next = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 12));
  return { kind: "full", total: counts.total, reopens: next.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) };
}

/** "Commissions open · 3 of 6 slots left in December" / "Commission waitlist · slots reopen Jan 1". */
export function slotLabel(state: SlotState): string | null {
  if (state.kind === "open") return `Commissions open · ${state.left} of ${state.total} slots left in ${state.month}`;
  if (state.kind === "full") return `Commission waitlist · slots reopen ${state.reopens}`;
  return null;
}

/** Short form for tight spaces (the nav bar). */
export function slotLabelShort(state: SlotState): string | null {
  if (state.kind === "open") return `${state.left}/${state.total} slots open`;
  if (state.kind === "full") return "Waitlist";
  return null;
}
