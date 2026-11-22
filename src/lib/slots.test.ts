import { test } from "node:test";
import assert from "node:assert/strict";
import { slotLabel, slotLabelShort, slotState } from "./slots";

test("no capacity or no data means no badge", () => {
  assert.deepEqual(slotState(null), { kind: "unlimited" });
  assert.deepEqual(slotState({ total: null, taken: 3 }), { kind: "unlimited" });
  assert.equal(slotLabel(slotState(null)), null);
});

test("free places are capacity minus orders in hand", () => {
  const s = slotState({ total: 6, taken: 1 });
  assert.deepEqual(s, { kind: "open", left: 5, total: 6 });
  assert.equal(slotLabel(s), "Commissions open · 5 of 6 slots free");
  assert.equal(slotLabelShort(s), "5/6 slots open");
});

test("a full queue reads as a waitlist, with no date promised", () => {
  const s = slotState({ total: 6, taken: 7 });
  assert.deepEqual(s, { kind: "full", total: 6 });
  assert.equal(slotLabel(s), "Commission waitlist · all 6 slots taken");
  assert.equal(slotLabelShort(s), "Waitlist");
  assert.deepEqual(slotState({ total: 0, taken: 0 }), { kind: "full", total: 0 });
});
