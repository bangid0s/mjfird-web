import { test } from "node:test";
import assert from "node:assert/strict";
import { slotLabel, slotLabelShort, slotState } from "./slots";

// 30 Nov 2026, 20:00 UTC is already 1 Dec 03:00 in Jakarta.
const lateNovUtc = new Date("2026-11-30T20:00:00Z");

test("no capacity or no data means no badge", () => {
  assert.deepEqual(slotState(null), { kind: "unlimited" });
  assert.deepEqual(slotState({ total: null, taken: 3 }), { kind: "unlimited" });
  assert.equal(slotLabel(slotState(null)), null);
});

test("open month names the month in studio time", () => {
  const s = slotState({ total: 6, taken: 3 }, lateNovUtc);
  assert.deepEqual(s, { kind: "open", left: 3, total: 6, month: "December" });
  assert.equal(slotLabel(s), "Commissions open · 3 of 6 slots left in December");
  assert.equal(slotLabelShort(s), "3/6 slots open");
});

test("a full month says when slots reopen, across the year end", () => {
  const dec = slotState({ total: 6, taken: 7 }, new Date("2026-12-15T05:00:00Z"));
  assert.deepEqual(dec, { kind: "full", total: 6, reopens: "Jan 1" });
  assert.equal(slotLabel(dec), "Commission waitlist · slots reopen Jan 1");
  assert.equal(slotLabelShort(dec), "Waitlist");
  assert.deepEqual(slotState({ total: 0, taken: 0 }, lateNovUtc), { kind: "full", total: 0, reopens: "Jan 1" });
});
