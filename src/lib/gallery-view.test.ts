import assert from "node:assert/strict";
import test from "node:test";
import type { GalleryItem } from "@/lib/data/gallery";
import { cardLabel, fullDate, isClientWork, monthYear } from "@/lib/gallery-view";

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
});

test("dates read the way the panel shows them, and tolerate junk", () => {
  assert.equal(monthYear("2026-11-10T08:00:00Z"), "Nov 2026");
  assert.equal(fullDate("2026-11-10T08:00:00Z"), "Nov 10, 2026");
  assert.equal(monthYear(undefined), "");
  assert.equal(fullDate("not a date"), "");
});
