import assert from "node:assert/strict";
import test from "node:test";
import type { GalleryItem } from "@/lib/data/gallery";
import { cardLabel, fullDate, isClientWork, monthYear, withCoverFirst } from "@/lib/gallery-view";

const base: GalleryItem = {
  id: "1",
  imageUrl: "https://example.com/a.png",
  title: "",
  caption: "",
  linkUrl: "",
  tags: [],
  services: [{ id: "s", slug: "dnd", title: "DnD Character Illustrations" }],
  clientName: "",
};

test("card label: own title first, then the service it's a sample of", () => {
  assert.equal(cardLabel({ ...base, title: "Kori" }), "Kori");
  assert.equal(cardLabel(base), "DnD Character Illustrations");
  assert.equal(cardLabel({ ...base, title: "   " }), "DnD Character Illustrations");
  assert.equal(cardLabel({ ...base, services: [], tags: ["Graphic Design"] }), "Graphic Design", "then its first tag");
  assert.equal(cardLabel({ ...base, services: [] }), "");
});

test("card label: no service fallback on the service's own page", () => {
  assert.equal(cardLabel(base, false), "");
  assert.equal(cardLabel({ ...base, title: "Kori" }, false), "Kori");
});

test("only real client work earns the Commission badge", () => {
  assert.equal(isClientWork(base), false, "being filed under a service isn't enough");
  assert.equal(isClientWork({ ...base, clientName: "Eleanor" }), true);
  assert.equal(isClientWork({ ...base, clientName: "  " }), false);
  assert.equal(isClientWork({ ...base, review: { quote: "Great", name: "Toban", role: "", verified: true } }), true);
  assert.equal(isClientWork({ ...base, fromCommission: true }), true, "an order delivered on this site is client work");
});

test("dates read the way the panel shows them, and tolerate junk", () => {
  assert.equal(monthYear("2026-11-10T08:00:00Z"), "Nov 2026");
  assert.equal(fullDate("2026-11-10T08:00:00Z"), "Nov 10, 2026");
  assert.equal(monthYear(undefined), "");
  assert.equal(fullDate("not a date"), "");
});

test("service page: cover first, then the samples", () => {
  const a = { ...base, id: "a", imageUrl: "https://x/a.png" };
  const b = { ...base, id: "b", imageUrl: "https://x/b.png" };
  const { coverItem, rest } = withCoverFirst([a, b], { url: "https://x/cover.png", alt: "DnD" });
  assert.deepEqual([coverItem?.imageUrl, coverItem?.title], ["https://x/cover.png", "DnD"]);
  assert.deepEqual(rest.map((i) => i.id), ["a", "b"]);
});

test("service page: a cover that is also a sample shows once, keeping its review", () => {
  const review = { quote: "Great", name: "Toban", role: "", verified: true };
  const a = { ...base, id: "a", imageUrl: "https://x/a.png" };
  const b = { ...base, id: "b", imageUrl: "https://x/b.png", title: "Kori", review };
  const { coverItem, rest } = withCoverFirst([a, b], { url: "https://x/b.png", alt: "DnD" });
  assert.deepEqual([coverItem?.id, coverItem?.title, coverItem?.review?.name], ["b", "Kori", "Toban"]);
  assert.deepEqual(rest.map((i) => i.id), ["a"]);
});

test("service page: no cover leaves the samples alone", () => {
  const a = { ...base, id: "a" };
  assert.deepEqual(withCoverFirst([a], undefined), { coverItem: null, rest: [a] });
  assert.deepEqual(withCoverFirst([a], { url: "  ", alt: "x" }), { coverItem: null, rest: [a] });
});
