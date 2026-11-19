import assert from "node:assert/strict";
import test from "node:test";
import { isFinished, nextStep, stepIndex } from "@/lib/commissions/next-step";
import type { CommissionStatus } from "@/lib/supabase/types";

const base = { final_price: null, estimated_total: 120, payment_url: null, hasReview: false, canPay: false };
const step = (status: CommissionStatus, extra: Partial<typeof base> = {}) => nextStep({ ...base, ...extra, status });

test("only payable, delivered and unreviewed requests are the client's move", () => {
  const owners = (["pending", "awaiting_payment", "in_progress", "delivered", "completed", "declined", "cancelled"] as const).map(
    (s) => step(s).owner,
  );
  assert.deepEqual(owners, ["ours", "ours", "ours", "yours", "yours", "done", "done"]);
});

test("payment is the client's move only once they can actually pay", () => {
  assert.equal(step("awaiting_payment").owner, "ours");
  const ready = step("awaiting_payment", { canPay: true, final_price: 180 } as never);
  assert.equal(ready.owner, "yours");
  assert.equal(ready.title, "Pay $180 to start");
  assert.equal(ready.action?.href, "#payment");
});

test("a completed request with a review is done", () => {
  assert.equal(step("completed", { hasReview: true }).owner, "done");
  assert.equal(step("completed").action?.href, "#review");
});

test("finished and step helpers", () => {
  assert.equal(isFinished("completed"), true);
  assert.equal(isFinished("delivered"), false);
  assert.equal(stepIndex("in_progress"), 2);
  assert.equal(stepIndex("declined"), -1);
});

test("work stages: a stage up for review is the client's move", () => {
  const stages = { work_stages: ["Sketch", "Lineart"], stage_index: 0 } as const;
  const review = nextStep({ ...base, ...stages, stage_status: "review", status: "in_progress" } as never);
  assert.equal(review.owner, "yours");
  assert.equal(review.title, "Sketch ready for your review");
  assert.equal(review.action?.href, "#stages");
  assert.equal(nextStep({ ...base, ...stages, stage_status: "changes", status: "in_progress" } as never).owner, "ours");
  assert.equal(nextStep({ ...base, ...stages, stage_status: "working", status: "in_progress" } as never).title, "Working on: Sketch");
  // No stages (or no migration yet): the plain in-progress step.
  assert.equal(step("in_progress").title, "Work in progress");
});
