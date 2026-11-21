import { test } from "node:test";
import assert from "node:assert/strict";
import type { GalleryItem } from "./data/gallery";
import { galleryDescription, galleryJsonLd, relatedItems } from "./gallery-page";

const dnd = { id: "s1", slug: "dnd-character", title: "DnD Character Illustrations" };
const base: GalleryItem = {
  id: "1", slug: "orc-bard", imageUrl: "https://x/art/orc-bard-1.webp", title: "Orc Bard",
  caption: "", linkUrl: "", tags: ["DnD"], services: [dnd], clientName: "", publishedAt: "2026-07-01T00:00:00Z",
};

test("description prefers the admin's caption, trimmed to 160 chars", () => {
  assert.equal(galleryDescription({ ...base, caption: "  Full body\nbard.  " }), "Full body bard.");
  assert.ok(galleryDescription({ ...base, caption: "x".repeat(300) }).length <= 160);
});

test("description falls back to a sentence naming the kind and client", () => {
  assert.equal(
    galleryDescription({ ...base, clientName: "West Marches Games" }),
    "Orc Bard: dnd character illustrations by M.J. Fird, made for West Marches Games. Hand-drawn commission work; order something similar.",
  );
});

test("related: same service, then shared tag, then the rest; never itself or page-less items", () => {
  const all: GalleryItem[] = [
    base,
    { ...base, id: "2", slug: "logo", tags: ["Brand"], services: [] },
    { ...base, id: "3", slug: "elf", tags: ["DnD"], services: [] },
    { ...base, id: "4", slug: "goliath", services: [dnd] },
    { ...base, id: "5", slug: undefined },
  ];
  assert.deepEqual(relatedItems(base, all).map((i) => i.id), ["4", "3", "2"]);
});

test("JSON-LD carries the licensing fields Google Images reads", () => {
  const ld = galleryJsonLd(base, "https://mjfird.com");
  assert.equal(ld["@type"], "VisualArtwork");
  assert.equal(ld.url, "https://mjfird.com/gallery/orc-bard");
  assert.equal(ld.image.acquireLicensePage, "https://mjfird.com/services/dnd-character");
  assert.equal(ld.image.copyrightNotice, "© 2026 M.J. Fird");
  assert.equal(ld.image.license, "https://mjfird.com/terms");
});
