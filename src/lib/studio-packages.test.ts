import { test } from "node:test";
import assert from "node:assert/strict";
import { STUDIO_PACKAGES, budgetBucket, milestoneLabel, milestoneSplit, packageInquiryMessage, packagePrice } from "./studio-packages";

test("package prices match the owner-approved table", () => {
  assert.deepEqual(
    STUDIO_PACKAGES.map((p) => [p.id, packagePrice(p)]),
    [
      ["character-cast", 630],
      ["card-set-10", 1080],
      ["card-set-20", 2040],
      ["custom-project", null],
    ],
  );
});

test("milestones follow terms section 4", () => {
  assert.deepEqual(milestoneSplit(120), [100]);
  assert.deepEqual(milestoneSplit(630), [50, 50]);
  assert.deepEqual(milestoneSplit(1000), [50, 50]);
  assert.deepEqual(milestoneSplit(1080), [40, 30, 30]);
  assert.equal(milestoneLabel(630), "50% to start, 50% before final files");
  assert.match(milestoneLabel(2040), /^40% to start/);
  for (const total of [120, 630, 2040]) assert.equal(milestoneSplit(total).reduce((a, b) => a + b, 0), 100);
});

test("the inquiry is preselected and prefilled for the package picked", () => {
  assert.equal(budgetBucket(630), "500-2k");
  assert.equal(budgetBucket(2040), "2k+");
  assert.equal(budgetBucket(null), "");
  assert.match(packageInquiryMessage("card-set-10"), /^I'm interested in the Card Set 10 package \(10 card illustrations\)\./);
  assert.match(packageInquiryMessage("nope"), /^I'm planning an illustration project\./);
});
