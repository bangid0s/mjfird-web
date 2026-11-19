import assert from "node:assert/strict";
import test from "node:test";
import { featuredThenNewest, newestFirst, postedAt } from "./reviews-order";

const r = (id: string, at?: string, featured = false) => ({ id, postedAt: at, featured });

test("postedAt prefers the client's submit time over the entry time", () => {
  assert.equal(postedAt({ submitted_at: "2026-05-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" }), "2026-05-01T00:00:00Z");
  assert.equal(postedAt({ submitted_at: null, created_at: "2026-01-01T00:00:00Z" }), "2026-01-01T00:00:00Z");
  assert.equal(postedAt({}), undefined);
});

test("newestFirst puts the most recent review first and undated ones last", () => {
  const out = newestFirst([r("old", "2025-01-01T00:00:00Z"), r("none"), r("new", "2026-06-01T00:00:00Z"), r("mid", "2026-01-01T00:00:00Z")]);
  assert.deepEqual(out.map((x) => x.id), ["new", "mid", "old", "none"]);
});

test("newestFirst keeps incoming order for equal dates", () => {
  const same = "2026-01-01T00:00:00Z";
  assert.deepEqual(newestFirst([r("a", same), r("b", same), r("c", same)]).map((x) => x.id), ["a", "b", "c"]);
});

test("featuredThenNewest leads with the pinned review, rest stay newest first", () => {
  const out = featuredThenNewest([
    r("new", "2026-06-01T00:00:00Z"),
    r("pinned", "2024-01-01T00:00:00Z", true),
    r("mid", "2026-01-01T00:00:00Z"),
  ]);
  assert.deepEqual(out.map((x) => x.id), ["pinned", "new", "mid"]);
});

test("featuredThenNewest without a pin is plain newest first", () => {
  const out = featuredThenNewest([r("old", "2025-01-01T00:00:00Z"), r("new", "2026-01-01T00:00:00Z")]);
  assert.deepEqual(out.map((x) => x.id), ["new", "old"]);
});

test("does not mutate the input", () => {
  const input = [r("old", "2025-01-01T00:00:00Z"), r("new", "2026-01-01T00:00:00Z", true)];
  featuredThenNewest(input);
  assert.deepEqual(input.map((x) => x.id), ["old", "new"]);
});
