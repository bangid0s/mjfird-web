import assert from "node:assert/strict";
import test from "node:test";
import { badgeLabel, safeHref, timeAgo } from "@/lib/notifications/format";

const NOW = Date.parse("2026-11-18T12:00:00Z");

test("timeAgo steps from seconds to a date", () => {
  assert.equal(timeAgo("2026-11-18T11:59:30Z", NOW), "just now");
  assert.equal(timeAgo("2026-11-18T11:55:00Z", NOW), "5m ago");
  assert.equal(timeAgo("2026-11-18T09:00:00Z", NOW), "3h ago");
  assert.equal(timeAgo("2026-11-16T12:00:00Z", NOW), "2d ago");
  assert.equal(timeAgo("2026-10-01T12:00:00Z", NOW), "Oct 1");
  assert.equal(timeAgo("2026-11-18T12:05:00Z", NOW), "just now", "clock skew never goes negative");
  assert.equal(timeAgo("nonsense", NOW), "");
});

test("badgeLabel hides zero and caps at 9+", () => {
  assert.equal(badgeLabel(0), null);
  assert.equal(badgeLabel(-1), null);
  assert.equal(badgeLabel(3), "3");
  assert.equal(badgeLabel(12), "9+");
});

test("safeHref keeps links on this site", () => {
  assert.equal(safeHref("/account/requests/abc"), "/account/requests/abc");
  assert.equal(safeHref("https://evil.example"), "/account");
  assert.equal(safeHref("//evil.example"), "/account");
  assert.equal(safeHref("/\\evil.example"), "/account");
  assert.equal(safeHref(null), "/account");
});
