import { test } from "node:test";
import assert from "node:assert/strict";
import { RETAINER_PLANS, RETAINER_TERMS, fromPrice, monthlyPrice, planInquiryMessage } from "./retainer";

const byId = (id: string) => RETAINER_PLANS.find((p) => p.id === id)!;

test("plan prices per term match the owner-approved table", () => {
  const table = RETAINER_PLANS.map((p) => [p.id, ...RETAINER_TERMS.map((t) => monthlyPrice(p, t))]);
  assert.deepEqual(table, [
    ["character-monthly", 240, 250, 265],
    ["card-art-batch", 410, 430, 455],
    ["campaign-partner", 475, 505, 530],
  ]);
  assert.equal(fromPrice(byId("character-monthly")), 240);
});

test("terms run 12 → 6 → 3 months with shrinking discounts", () => {
  assert.deepEqual(RETAINER_TERMS.map((t) => t.months), [12, 6, 3]);
  assert.deepEqual(RETAINER_TERMS.map((t) => t.discount), [0.15, 0.1, 0.05]);
});

test("starting from a plan prefills the inquiry with that plan's name", () => {
  assert.match(planInquiryMessage("card-art-batch"), /^I'm interested in the Card Art Batch retainer\./);
  assert.match(planInquiryMessage(undefined), /^I'm interested in a monthly retainer\./);
  assert.match(planInquiryMessage("nope"), /^I'm interested in a monthly retainer\./);
  assert.ok(planInquiryMessage("card-art-batch").includes("Pieces per month:"));
});
