import { test } from "node:test";
import assert from "node:assert/strict";
import { projectImageLabel } from "./alt-text";

test("names the piece, its kind and the artist", () => {
  assert.equal(
    projectImageLabel({ title: " Jack Hefetz", category: "Illustration" }),
    "Jack Hefetz, illustration by M.J. Fird",
  );
});

test("works without a category", () => {
  assert.equal(projectImageLabel({ title: "Lumi App", category: "" }), "Lumi App by M.J. Fird");
});
