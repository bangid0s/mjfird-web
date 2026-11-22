import { test } from "node:test";
import assert from "node:assert/strict";
import { narrativeBlocks } from "./narrative-blocks";

test("blank lines split paragraphs; Windows line endings too", () => {
  assert.deepEqual(narrativeBlocks("One.\r\n\r\nTwo.\r\nStill two."), [
    { kind: "paragraph", lines: ["One."] },
    { kind: "paragraph", lines: ["Two.", "Still two."] },
  ]);
});

test("dash or bullet lines become a list, even right under a paragraph", () => {
  assert.deepEqual(narrativeBlocks("Seven pieces.\n- Shape language\n- Costumes\n\nAfter."), [
    { kind: "paragraph", lines: ["Seven pieces."] },
    { kind: "list", items: ["Shape language", "Costumes"] },
    { kind: "paragraph", lines: ["After."] },
  ]);
  assert.deepEqual(narrativeBlocks("• one\n• two"), [{ kind: "list", items: ["one", "two"] }]);
});

test("a hyphen inside a sentence is not a bullet; empty text gives nothing", () => {
  assert.deepEqual(narrativeBlocks("Half-fae - and proud."), [{ kind: "paragraph", lines: ["Half-fae - and proud."] }]);
  assert.deepEqual(narrativeBlocks("  \n\n "), []);
});
