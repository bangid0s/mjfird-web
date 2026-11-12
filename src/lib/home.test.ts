import assert from "node:assert/strict";
import test from "node:test";
import { HOME_CONTENT_PATHS } from "@/lib/admin/revalidate-paths";
import { LATE_COLUMNS, lateColumnFallbacks } from "@/lib/admin/site-settings-columns";
import { sectionPayload } from "@/lib/admin/site-settings-sections";
import type { GalleryItem } from "@/lib/data/gallery";
import type { ServicePackage } from "@/lib/services/storefront";
import {
  DEFAULT_HOME_FAQ,
  commissionStatus,
  fastestDelivery,
  heroFacts,
  heroMode,
  homeFaq,
  includedRevisions,
  numberSections,
  orderLabel,
  packageLines,
  parseHeroStyle,
  pickWallItems,
  processAssurances,
  serviceSamples,
  wallColumns,
} from "@/lib/home";

const item = (id: string, slugs: string[], url = `https://img.example/${id}.png`): GalleryItem => ({
  id,
  imageUrl: url,
  title: "",
  caption: "",
  linkUrl: "",
  tags: [],
  services: slugs.map((slug) => ({ id: slug, slug, title: slug })),
  clientName: "",
});

const pkg = (over: Partial<ServicePackage> = {}): ServicePackage => ({
  id: "p",
  name: "Bust Up",
  description: "",
  price: 35,
  delivery_days: 7,
  revisions: 2,
  features: ["Sketch approval before color"],
  extra_characters_max: 0,
  ...over,
});

const open = { availability: "open" as const, slotsTotal: null, slotsTaken: 0 };

test("wall: takes one image per service in turn, in service order", () => {
  const gallery = [item("d1", ["dnd"]), item("d2", ["dnd"]), item("d3", ["dnd"]), item("m1", ["mtg"]), item("p1", ["poke"])];
  const wall = pickWallItems(gallery, ["dnd", "mtg", "poke"]);
  assert.deepEqual(wall.map((i) => i.id), ["d1", "m1", "p1", "d2", "d3"]);
});

test("wall: stops at the limit and survives an empty gallery or no services", () => {
  const gallery = Array.from({ length: 30 }, (_, i) => item(`d${i}`, ["dnd"]));
  assert.equal(pickWallItems(gallery, ["dnd"]).length, 18);
  assert.equal(pickWallItems(gallery, ["dnd"], 4).length, 4);
  assert.deepEqual(pickWallItems([], ["dnd"]), []);
  assert.deepEqual(pickWallItems(gallery, []), []);
});

test("wall: an image under two services appears once, under the first in service order", () => {
  const gallery = [item("both", ["mtg", "dnd"]), item("m1", ["mtg"])];
  const wall = pickWallItems(gallery, ["dnd", "mtg", "dnd"]);
  assert.deepEqual(wall.map((i) => i.id), ["both", "m1"]);
});

test("wall: videos, YouTube links, unfiled images and blank addresses are left out", () => {
  const gallery = [
    item("clip", ["dnd"], "https://img.example/reel.mp4"),
    item("yt", ["dnd"], "https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    item("loose", []),
    item("unpublished", ["retired-service"]),
    item("blank", ["dnd"], ""),
    item("ok", ["dnd"]),
  ];
  assert.deepEqual(pickWallItems(gallery, ["dnd"]).map((i) => i.id), ["ok"]);
});

test("wall columns: deals items across columns and repeats a short column to the minimum", () => {
  const cols = wallColumns(["a", "b", "c", "d", "e", "f", "g"], 3, 4);
  assert.deepEqual(cols.map((col) => col.map((t) => t.item)), [
    ["a", "d", "g", "a"],
    ["b", "e", "b", "e"],
    ["c", "f", "c", "f"],
  ]);
  assert.deepEqual(cols[0].map((t) => t.repeat), [false, false, false, true]);
  assert.deepEqual(cols[0].map((t) => t.index), [0, 3, 6, 0]);
  assert.deepEqual(wallColumns([], 3, 4), [[], [], []]);
});

test("hero style: anything but 'slider' is the wall; too few images falls back to the slider", () => {
  assert.equal(parseHeroStyle("slider"), "slider");
  for (const junk of [undefined, null, "", "WALL", "carousel", 3]) assert.equal(parseHeroStyle(junk), "wall");
  assert.equal(heroMode("wall", 6), "wall");
  assert.equal(heroMode("wall", 5), "slider");
  assert.equal(heroMode("slider", 18), "slider");
});

test("status: open wins, then waitlist; a full 'open' service counts as waitlist", () => {
  assert.equal(commissionStatus([]), null);
  assert.equal(commissionStatus([{ ...open, availability: "closed" }, open]), "open");
  assert.equal(commissionStatus([{ ...open, availability: "closed" }, { ...open, availability: "waitlist" }]), "waitlist");
  assert.equal(commissionStatus([{ availability: "open", slotsTotal: 3, slotsTaken: 3 }]), "waitlist");
  assert.equal(commissionStatus([{ ...open, availability: "closed" }]), "closed");
  assert.equal(orderLabel("open"), "Order");
  assert.notEqual(orderLabel("waitlist"), "Order");
  assert.notEqual(orderLabel("closed"), "Order");
});

test("facts: lowest price, fastest stated delivery, lowest revision count", () => {
  const services = [
    { packages: [pkg({ price: 35 }), pkg({ price: 70, delivery_days: 10, revisions: 3 })] },
    { packages: [pkg({ price: 15, delivery_days: 9 })] },
  ];
  assert.deepEqual(heroFacts(services), ["From $15", "7+ days", "2 revision rounds"]);
});

test("facts: a zero is left out, never printed; one round is singular; no packages means no facts", () => {
  assert.deepEqual(heroFacts([{ packages: [pkg({ delivery_days: 0, revisions: 0 })] }]), ["From $35"]);
  assert.deepEqual(heroFacts([{ packages: [pkg({ revisions: 1 })] }]), ["From $35", "7+ days", "1 revision round"]);
  assert.deepEqual(heroFacts([]), []);
  assert.deepEqual(heroFacts([{ packages: [] }]), []);
  assert.equal(fastestDelivery([pkg({ delivery_days: 0 }), pkg({ delivery_days: 12 })]), 12);
  assert.equal(fastestDelivery([]), null);
  assert.equal(includedRevisions([pkg({ revisions: 3 }), pkg({ revisions: 0 })]), null);
});

test("packages: up to three lines in stored order, then a count of the rest", () => {
  const four = [pkg({ name: "A", price: 30 }), pkg({ name: "B", price: 35 }), pkg({ name: "C", price: 40.5 }), pkg({ name: "D", price: 15 })];
  assert.deepEqual(packageLines(four), {
    lines: [{ name: "A", price: "$30" }, { name: "B", price: "$35" }, { name: "C", price: "$40.50" }],
    more: 1,
    // The cheapest package ($15) is the fourth: the listed lines don't show it.
    showsLowest: false,
  });
  assert.equal(packageLines([pkg({ price: 15 }), pkg({ price: 30 }), pkg({ price: 35 }), pkg({ price: 40 })]).showsLowest, true);
  assert.deepEqual(packageLines([pkg()]), { lines: [{ name: "Bust Up", price: "$35" }], more: 0, showsLowest: true });
  assert.deepEqual(packageLines([]), { lines: [], more: 0, showsLowest: false });
});

test("samples: gallery images first, then manual samples, no repeats, no video, capped", () => {
  const gallery = [
    item("d1", ["dnd"]),
    item("clip", ["dnd"], "https://img.example/reel.webm"),
    item("both", ["mtg", "dnd"]),
    item("m1", ["mtg"]),
  ];
  const service = {
    slug: "dnd",
    samples: [
      { url: "https://img.example/d1.png", alt: "repeat of d1" },
      { url: "https://img.example/manual.png", alt: "Manual" },
    ],
  };
  const out = serviceSamples(service, gallery);
  assert.deepEqual(out.map((i) => i.imageUrl), [
    "https://img.example/d1.png",
    "https://img.example/both.png",
    "https://img.example/manual.png",
  ]);
  assert.equal(out[2].title, "Manual");
  assert.equal(serviceSamples(service, gallery, 2).length, 2);
  assert.deepEqual(serviceSamples({ slug: "emotes", samples: [] }, gallery), []);
});

test("assurances: revisions when above zero, sketch only when every service mentions it", () => {
  const sketchy = { packages: [pkg()] };
  const plain = { packages: [pkg({ features: ["High-res PNG"] })] };
  assert.deepEqual(processAssurances([sketchy, sketchy]), [
    "2 revision rounds included",
    "Sketch approval before color",
    "Work starts once the invoice is paid",
  ]);
  assert.deepEqual(processAssurances([sketchy, plain]), [
    "2 revision rounds included",
    "Work starts once the invoice is paid",
  ]);
  assert.deepEqual(processAssurances([]), ["Work starts once the invoice is paid"]);
});

test("assurances: a quote-only service with no packages doesn't cancel the sketch promise", () => {
  const sketchy = { packages: [pkg()] };
  const quoteOnly = { packages: [] };
  assert.deepEqual(processAssurances([sketchy, quoteOnly]), [
    "2 revision rounds included",
    "Sketch approval before color",
    "Work starts once the invoice is paid",
  ]);
  assert.deepEqual(processAssurances([quoteOnly]), ["Work starts once the invoice is paid"]);
});

test("faq: the admin's list wins; an empty list falls back to the five defaults", () => {
  const own = [{ q: "Do you ship prints?", a: "No." }];
  assert.equal(homeFaq(own), own);
  assert.equal(homeFaq([]), DEFAULT_HOME_FAQ);
  assert.equal(DEFAULT_HOME_FAQ.length, 5);
});

test("section numbers: assigned in order, an omitted section leaves no gap", () => {
  assert.deepEqual(numberSections({ menu: true, process: false, faq: true, work: true }), {
    menu: 1,
    process: 0,
    faq: 2,
    work: 3,
  });
});

const formOf = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

test("hero style: the Home screen saves it, and only as one of the two values", () => {
  assert.equal(sectionPayload("home", formOf({ hero_style: "slider" })).hero_style, "slider");
  assert.equal(sectionPayload("home", formOf({ hero_style: "wall" })).hero_style, "wall");
  assert.equal(sectionPayload("home", formOf({ hero_style: "<script>" })).hero_style, "wall");
  assert.equal(sectionPayload("home", formOf({})).hero_style, "wall");
  assert.equal("hero_style" in sectionPayload("services", formOf({ hero_style: "slider" })), false);
});

test("hero style: before migration 0042 a Home save loses only the hero style", () => {
  assert.equal(LATE_COLUMNS.includes("hero_style"), true);
  const payload = sectionPayload(
    "home",
    formOf({ hero_style: "slider", hero_eyebrow: "Illustrator", hero_headline: "Card art", hero_cta_primary_url: "/gallery" }),
  );
  const [first] = lateColumnFallbacks(payload);
  assert.equal("hero_style" in first, false);
  // 0034 and 0041 are already applied on such a database: their columns must still be written.
  assert.equal(first.hero_headline, "Card art");
  assert.equal(first.hero_cta_primary_url, "/gallery");
  assert.equal(first.hero_eyebrow, "Illustrator");
});

test("late columns: each retry drops one more migration, newest first, down to the original columns", () => {
  const payload = sectionPayload("home", formOf({ hero_eyebrow: "Illustrator" }));
  const steps = lateColumnFallbacks(payload);
  assert.equal(steps.length, 3);
  assert.equal("hero_cta_primary_url" in steps[0], true);
  assert.equal("hero_cta_primary_url" in steps[1], false);
  assert.equal("hero_headline" in steps[1], true);
  assert.equal("hero_headline" in steps[2], false);
  assert.equal(steps[2].hero_eyebrow, "Illustrator");
  for (const column of LATE_COLUMNS) assert.equal(column in steps[2], false, column);
});

test("late columns: a screen that owns none of a migration's columns gets no empty retry for it", () => {
  // Services owns only 0034 columns: one retry, not three.
  assert.equal(lateColumnFallbacks(sectionPayload("services", formOf({}))).length, 1);
  assert.deepEqual(lateColumnFallbacks({ site_title: "x" }), []);
});

test("gallery saves refresh the home page, whose wall and menu samples come from the gallery", () => {
  assert.equal(HOME_CONTENT_PATHS.gallery.includes("/"), true);
  assert.equal(HOME_CONTENT_PATHS.gallery.includes("/gallery"), true);
});
