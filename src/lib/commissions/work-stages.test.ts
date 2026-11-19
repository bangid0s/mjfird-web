import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkStages, workStagesOf } from "@/lib/commissions/work-stages";

test("stages show only while in progress, and only when the request has some", () => {
  assert.equal(workStagesOf({ status: "in_progress" }), null, "before the migration");
  assert.equal(workStagesOf({ status: "in_progress", work_stages: [] }), null);
  assert.equal(workStagesOf({ status: "delivered", work_stages: ["Sketch"] }), null);
  const s = workStagesOf({ status: "in_progress", work_stages: ["Sketch", "Final"], stage_index: 1 });
  assert.deepEqual(s, { stages: ["Sketch", "Final"], index: 1, current: "Final", isLast: true });
});

test("an out-of-range index is clamped", () => {
  assert.equal(workStagesOf({ status: "in_progress", work_stages: ["A", "B"], stage_index: 9 })?.current, "B");
});

test("parseWorkStages trims, drops blanks and duplicates, caps the list", () => {
  assert.deepEqual(parseWorkStages(" Sketch \n\nLineart\nsketch\nColour"), ["Sketch", "Lineart", "Colour"]);
  assert.equal(parseWorkStages(Array.from({ length: 15 }, (_, i) => `S${i}`).join("\n")).length, 10);
});
