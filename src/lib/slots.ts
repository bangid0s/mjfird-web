/*
  The studio's commission capacity as a visitor reads it: how many orders can
  be in hand at once, and how many of those places are free. A place frees up
  when an order is completed, so there is no date to promise.
*/

export type SlotState =
  | { kind: "unlimited" }
  | { kind: "open"; left: number; total: number }
  | { kind: "full"; total: number };

export function slotState(counts: { total: number | null; taken: number } | null): SlotState {
  if (!counts || counts.total === null) return { kind: "unlimited" };
  const left = Math.max(0, counts.total - counts.taken);
  return left > 0 ? { kind: "open", left, total: counts.total } : { kind: "full", total: counts.total };
}

/** "Commissions open · 5 of 6 slots free" / "Commission waitlist · all 6 slots taken". */
export function slotLabel(state: SlotState): string | null {
  if (state.kind === "open") return `Commissions open · ${state.left} of ${state.total} slots free`;
  if (state.kind === "full") return `Commission waitlist · all ${state.total} slots taken`;
  return null;
}

/** Short form for tight spaces (the nav bar). */
export function slotLabelShort(state: SlotState): string | null {
  if (state.kind === "open") return `${state.left}/${state.total} slots open`;
  if (state.kind === "full") return "Waitlist";
  return null;
}
