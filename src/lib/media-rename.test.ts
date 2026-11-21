import { test } from "node:test";
import assert from "node:assert/strict";
import { renamedKey } from "./admin/media-actions";

test("a rename stays in the file's folder", async () => {
  assert.equal(await renamedKey("art/orc-bard-1.webp", "art/orc-bard-full-body.webp"), "art/orc-bard-full-body.webp");
  assert.equal(await renamedKey("art/orc-bard-1.webp", "orc bard.webp"), "art/orc_bard.webp");
  assert.equal(await renamedKey("logo.png", "../art/x.png"), "x.png");
  assert.equal(await renamedKey("logo.png", "   "), "");
});
