import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanParams, trackEvent } from "./track";

test("empty params are dropped before sending", () => {
  assert.deepEqual(cleanParams({ item_id: "dnd", value: 35, note: "", missing: undefined, ok: false }), {
    item_id: "dnd",
    value: 35,
    ok: false,
  });
});

test("tracking on the server is a no-op, never a crash", () => {
  assert.doesNotThrow(() => trackEvent("view_item", { item_id: "dnd" }));
});
