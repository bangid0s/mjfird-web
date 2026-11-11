# Home Page Art Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the home page for commission buyers: an offer beside a drifting wall of gallery commissions, a priced menu for every published service, process, FAQ, then the studio and brand block.

**Architecture:** Every rule that can be wrong lives as a pure function in `src/lib/home.ts` and is unit-tested. `app/(site)/page.tsx` stays a server component that loads data once and hands plain values to new components under `src/components/home/`. Motion is CSS (keyframes and custom properties in `globals.css`); the only client code is the wall's pause/lightbox state, the sample strip's lightbox state and the pointer tilt.

**Tech Stack:** Next.js 16.2 (App Router), React 19, Tailwind CSS 4, Supabase, `tsx --test` with `node:assert`.

**Spec:** `docs/superpowers/specs/2026-11-11-home-page-art-wall-design.md`

## Global Constraints

- Home page only. Do not change the nav, the footer, or any other route's output. `/services` keeps `ServiceCard`.
- Keep Studio Spec: existing tokens in `src/app/globals.css`, zero radius, hairlines, one accent. No new colours, fonts or dependencies.
- `AGENTS.md`: this Next.js version differs from training data. Run `npm ci`, then read the matching guide under `node_modules/next/dist/docs/` before changing image handling or data loading.
- Nothing is written to the live database. Migration `0042` is committed, never applied by this work.
- No invented prices or claims: every number on the page is computed from the services; the only fixed copy is the default headline, the FAQ defaults and one assurance line, all copied from the spec.
- Empty data omits the section; nothing renders an empty frame.
- Every new component works in light and dark and inside `.tone-invert`, and respects `prefers-reduced-motion`.
- Spelling follows the live site: "color", not "colour".
- Gallery images are hosted on third-party CDNs (Behance, DeviantArt), so they render as plain `<img>` and cannot be resized. Tiles beyond the first six load lazily.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01TyaVFfgAQCqGBR8FVYmeAK
  ```

## Review Focus

1. **An image filed under two services.** It must appear once in the wall (under the first of its services in service order) and in both services' menu samples. Pinned in Task 1.
2. **Every service closed, or "open" with all slots taken.** The hero must not say "Open for commissions", and the row button must not say "Order". Pinned in Task 1.
3. **A package with `delivery_days` 0 or `revisions` 0.** The facts line and the assurances must leave the fact out, never print "0+ days" or "0 revision rounds". Pinned in Task 1.
4. **Videos and YouTube links in the gallery.** They are filed under services too; they must not become wall tiles or menu samples. Pinned in Task 1.
5. **`hero_style` missing, null or junk, and a Home save before migration 0042.** The hero must be the wall, and the save must keep every other field. Pinned in Task 2.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/home.ts` (new) | Pure home-page rules |
| `src/lib/home.test.ts` (new) | Tests for those rules and the `hero_style` save path |
| `supabase/migrations/0042_hero_style.sql` (new) | `hero_style` column |
| `src/lib/supabase/types.ts` | Optional `hero_style` on `SiteSettingsRow` |
| `src/lib/data/site-settings.ts` | `heroStyle` on `SiteSettings` |
| `src/lib/admin/site-settings-columns.ts` | `hero_style` may be skipped before 0042 |
| `src/lib/admin/site-settings-sections.ts` | Parse and assign `hero_style` to the Home screen |
| `src/components/admin/SettingsForm.tsx` | Pending-migration notice names 0042 |
| `src/app/admin/(dashboard)/pages/home/page.tsx` | "Hero style" select, headline hint |
| `src/app/globals.css` | Tilt, wall and word-rise styles |
| `src/components/media/SmartImage.tsx` | Opt-in `lazy` for plain images |
| `src/components/home/TiltCard.tsx` (new, client) | Pointer tilt and highlight |
| `src/components/home/ArtWall.tsx` (new, client) | Drifting wall, pause rules, lightbox |
| `src/components/home/HomeHero.tsx` (new, server) | Wall hero layout and copy |
| `src/components/home/SampleStrip.tsx` (new, client) | A service's samples and lightbox |
| `src/components/home/CommissionMenu.tsx` (new, server) | One row per service |
| `src/components/home/HomeFaq.tsx` (new, server) | FAQ section layout |
| `src/components/reviews/Testimonials.tsx` | `limit` prop |
| `src/app/(site)/page.tsx` | Data loading and section order |

---

### Task 1: Home page rules

**Files:**
- Create: `src/lib/home.ts`
- Test: `src/lib/home.test.ts`

**Interfaces:**
- Consumes: `GalleryItem` (`@/lib/data/gallery`, type only), `ServicePackage`, `Availability`, `effectiveAvailability`, `formatUSD` (`@/lib/services/storefront`), `isVideoFile`, `isYouTubeUrl` (`@/lib/media`).
- Produces (all from `@/lib/home`):
  - `DEFAULT_HERO_HEADLINE: string`, `DEFAULT_HOME_FAQ: { q: string; a: string }[]`, `WALL_MIN = 6`, `WALL_MAX = 18`
  - `type HeroStyle = "wall" | "slider"`; `parseHeroStyle(value: unknown): HeroStyle`; `heroMode(style: HeroStyle, wallCount: number): HeroStyle`
  - `pickWallItems(items: GalleryItem[], serviceOrder: string[], limit?: number): GalleryItem[]`
  - `wallColumns<T>(items: T[], count?: number, minPerColumn?: number): { item: T; index: number; repeat: boolean }[][]`
  - `commissionStatus(services: WithAvailability[]): Availability | null`; `STATUS_LABEL: Record<Availability, string>`; `orderLabel(status: Availability): string`
  - `fastestDelivery(packages: ServicePackage[]): number | null`; `includedRevisions(packages: ServicePackage[]): number | null`
  - `heroFacts(services: WithPackages[]): string[]`
  - `packageLines(packages: ServicePackage[], max?: number): { lines: { name: string; price: string }[]; more: number }`
  - `serviceSamples(service: { slug: string; samples: { url: string; alt: string }[] }, gallery: GalleryItem[], max?: number): GalleryItem[]`
  - `processAssurances(services: WithPackages[]): string[]`
  - `homeFaq(fromSettings: { q: string; a: string }[]): { q: string; a: string }[]`
  - `numberSections<K extends string>(shown: Record<K, boolean>): Record<K, number>`

- [ ] **Step 1: Install dependencies and confirm the suite is green**

Run: `npm ci && npm test`
Expected: all existing tests pass.

- [ ] **Step 2: Write the failing tests**

<!-- file: src/lib/home.test.ts -->
```ts
import assert from "node:assert/strict";
import test from "node:test";
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
  });
  assert.deepEqual(packageLines([pkg()]), { lines: [{ name: "Bust Up", price: "$35" }], more: 0 });
  assert.deepEqual(packageLines([]), { lines: [], more: 0 });
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx tsx --test src/lib/home.test.ts`
Expected: FAIL, cannot find module `@/lib/home`.

- [ ] **Step 4: Write the implementation**

<!-- file: src/lib/home.ts -->
```ts
import type { GalleryItem } from "@/lib/data/gallery";
import { isVideoFile, isYouTubeUrl } from "@/lib/media";
import {
  effectiveAvailability,
  formatUSD,
  type Availability,
  type ServicePackage,
} from "@/lib/services/storefront";

/*
  Every rule the home page follows, as pure functions: which gallery images
  make the wall, what the hero may claim about price and timing, what a
  service row shows. The page and its components only lay these values out.

  Nothing here invents a number. Prices, days and revision rounds are read
  from the services' own packages, and a fact with no data is left out.
*/

/** Used when the admin's hero headline is blank and the hero is the art wall. */
export const DEFAULT_HERO_HEADLINE = "Custom character art for your D&D party, MTG deck and Pokémon cards.";

/** Fewer eligible images than this and the hero falls back to the slider. */
export const WALL_MIN = 6;
export const WALL_MAX = 18;

export type HeroStyle = "wall" | "slider";

/** The stored setting, or the wall when the column is missing or holds anything else. */
export function parseHeroStyle(value: unknown): HeroStyle {
  return value === "slider" ? "slider" : "wall";
}

/** The hero actually rendered: a wall needs enough images to not look empty. */
export function heroMode(style: HeroStyle, wallCount: number): HeroStyle {
  return style === "wall" && wallCount >= WALL_MIN ? "wall" : "slider";
}

type WithPackages = { packages: ServicePackage[] };
type WithAvailability = { availability: Availability; slotsTotal: number | null; slotsTaken: number };

function isStill(url: string) {
  return Boolean(url) && !isVideoFile(url) && !isYouTubeUrl(url);
}

/**
 * Gallery images for the hero wall: stills filed under a published service,
 * dealt one per service in turn so the wall is a mix rather than one service's
 * run. An image under several services counts once, under the first of them
 * in service order. Gallery order is kept within each service.
 */
export function pickWallItems(items: GalleryItem[], serviceOrder: string[], limit = WALL_MAX): GalleryItem[] {
  const queues = new Map<string, GalleryItem[]>(serviceOrder.map((slug) => [slug, []]));
  const slugs = [...queues.keys()];
  for (const item of items) {
    if (!isStill(item.imageUrl)) continue;
    const home = slugs.find((slug) => item.services.some((s) => s.slug === slug));
    if (home) queues.get(home)!.push(item);
  }

  const out: GalleryItem[] = [];
  for (let round = 0; out.length < limit; round++) {
    let took = false;
    for (const slug of slugs) {
      const next = queues.get(slug)![round];
      if (!next) continue;
      out.push(next);
      took = true;
      if (out.length === limit) break;
    }
    if (!took) break;
  }
  return out;
}

/**
 * Deals wall items across columns. A column shorter than `minPerColumn` is
 * padded by repeating its own items, so a looping column is never shorter
 * than the panel it scrolls in. `index` points back into the original list;
 * `repeat` marks padding, which is hidden from assistive technology.
 */
export function wallColumns<T>(
  items: T[],
  count = 3,
  minPerColumn = 4,
): { item: T; index: number; repeat: boolean }[][] {
  const columns = Array.from({ length: count }, (_, c) =>
    items.map((item, index) => ({ item, index, repeat: false })).filter((tile) => tile.index % count === c),
  );
  return columns.map((column) => {
    if (column.length === 0 || column.length >= minPerColumn) return column;
    const padded = [...column];
    for (let i = 0; padded.length < minPerColumn; i++) padded.push({ ...column[i % column.length], repeat: true });
    return padded;
  });
}

/** What the hero may say about taking work: open beats waitlist beats closed. */
export function commissionStatus(services: WithAvailability[]): Availability | null {
  if (services.length === 0) return null;
  const states = services.map((s) => effectiveAvailability(s.availability, s.slotsTotal, s.slotsTaken));
  if (states.includes("open")) return "open";
  if (states.includes("waitlist")) return "waitlist";
  return "closed";
}

export const STATUS_LABEL: Record<Availability, string> = {
  open: "Open for commissions",
  waitlist: "Waitlist open",
  closed: "Commissions closed",
};

/** A row's button never promises an order the service can't take. */
export function orderLabel(status: Availability): string {
  if (status === "open") return "Order";
  if (status === "waitlist") return "Join the waitlist";
  return "See details";
}

/** Shortest stated delivery time; packages that state none (0) are ignored. */
export function fastestDelivery(packages: ServicePackage[]): number | null {
  const days = packages.map((p) => p.delivery_days).filter((d) => d > 0);
  return days.length > 0 ? Math.min(...days) : null;
}

/** Revision rounds every package includes, or null when any package includes none. */
export function includedRevisions(packages: ServicePackage[]): number | null {
  if (packages.length === 0) return null;
  const least = Math.min(...packages.map((p) => p.revisions));
  return least > 0 ? least : null;
}

function rounds(count: number) {
  return `${count} revision ${count === 1 ? "round" : "rounds"}`;
}

/** The hero's facts line, computed across every published service. */
export function heroFacts(services: WithPackages[]): string[] {
  const packages = services.flatMap((s) => s.packages);
  if (packages.length === 0) return [];
  const facts = [`From ${formatUSD(Math.min(...packages.map((p) => p.price)))}`];
  const days = fastestDelivery(packages);
  if (days !== null) facts.push(`${days}+ days`);
  const revisions = includedRevisions(packages);
  if (revisions !== null) facts.push(rounds(revisions));
  return facts;
}

/** A service row's package list: the first few in stored order, then how many more. */
export function packageLines(
  packages: ServicePackage[],
  max = 3,
): { lines: { name: string; price: string }[]; more: number } {
  return {
    lines: packages.slice(0, max).map((p) => ({ name: p.name, price: formatUSD(p.price) })),
    more: Math.max(0, packages.length - max),
  };
}

/**
 * A service's samples for its menu row: the gallery stills filed under it,
 * then its own manual samples, each address once.
 */
export function serviceSamples(
  service: { slug: string; samples: { url: string; alt: string }[] },
  gallery: GalleryItem[],
  max = 4,
): GalleryItem[] {
  const filed = gallery.filter(
    (item) => isStill(item.imageUrl) && item.services.some((s) => s.slug === service.slug),
  );
  const manual: GalleryItem[] = service.samples
    .filter((sample) => isStill(sample.url))
    .map((sample, i) => ({
      id: `${service.slug}-sample-${i}`,
      imageUrl: sample.url,
      title: sample.alt,
      caption: "",
      linkUrl: "",
      tags: [],
      services: [],
      clientName: "",
    }));

  const seen = new Set<string>();
  const out: GalleryItem[] = [];
  for (const item of [...filed, ...manual]) {
    if (seen.has(item.imageUrl)) continue;
    seen.add(item.imageUrl);
    out.push(item);
    if (out.length === max) break;
  }
  return out;
}

/** The short promises under "How it works". Only the last one is fixed text. */
export function processAssurances(services: WithPackages[]): string[] {
  const out: string[] = [];
  const revisions = includedRevisions(services.flatMap((s) => s.packages));
  if (revisions !== null) out.push(`${rounds(revisions)} included`);
  const everySketch =
    services.length > 0 &&
    services.every((s) => s.packages.some((p) => p.features.some((feature) => /sketch/i.test(feature))));
  if (everySketch) out.push("Sketch approval before color");
  out.push("Work starts once the invoice is paid");
  return out;
}

/** Composed only from the terms and FAQs already published on the service pages. */
export const DEFAULT_HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "How long does it take?",
    a: "Seven days or more, depending on the size of the piece and my queue. I confirm a delivery date in your quote, before you pay. Rush delivery is +50%.",
  },
  {
    q: "How do I pay?",
    a: "Once we agree on the scope, I send an invoice. Work starts when it is paid.",
  },
  {
    q: "How many revisions do I get?",
    a: "Most commissions include two rounds, mostly at the sketch stage, and you approve the sketch before I move to color. A major redesign after approval counts as new work.",
  },
  {
    q: "What do you need from me?",
    a: "Your character sheet or description, any references, the pose and mood you want, and where the art will be used.",
  },
  {
    q: "Can I use the art commercially?",
    a: "It depends on the commission, and each service page lists what its license covers. D&D character art includes use in streams, videos and socials. MTG and Pokémon card art is for personal use only.",
  },
];

/** The admin's Services FAQ when it has entries, otherwise the defaults above. */
export function homeFaq(fromSettings: { q: string; a: string }[]): { q: string; a: string }[] {
  return fromSettings.length > 0 ? fromSettings : DEFAULT_HOME_FAQ;
}

/** Section numbers in render order: a section that isn't shown gets 0 and leaves no gap. */
export function numberSections<K extends string>(shown: Record<K, boolean>): Record<K, number> {
  let n = 0;
  const out = {} as Record<K, number>;
  for (const key of Object.keys(shown) as K[]) out[key] = shown[key] ? ++n : 0;
  return out;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsx --test src/lib/home.test.ts && npm test`
Expected: PASS, including the existing suite.

- [ ] **Step 6: Commit**

```bash
git add src/lib/home.ts src/lib/home.test.ts
git commit -m "Home page rules: wall selection, facts, samples, FAQ fallback"
```

---

### Task 2: Hero style setting

**Files:**
- Create: `supabase/migrations/0042_hero_style.sql`
- Modify: `src/lib/supabase/types.ts` (after `hero_cta_secondary_url`), `src/lib/data/site-settings.ts`, `src/lib/admin/site-settings-columns.ts`, `src/lib/admin/site-settings-sections.ts`, `src/components/admin/SettingsForm.tsx`, `src/app/admin/(dashboard)/pages/home/page.tsx`
- Test: `src/lib/home.test.ts`

**Interfaces:**
- Consumes: `parseHeroStyle`, `HeroStyle` from Task 1.
- Produces: `SiteSettings.heroStyle: HeroStyle`; form field name `hero_style`; `HERO_STYLE_COLUMNS` in `site-settings-columns.ts`.

- [ ] **Step 1: Write the failing tests** (append to `src/lib/home.test.ts`)

```ts
import { LATE_COLUMNS, withoutOverhaulColumns } from "@/lib/admin/site-settings-columns";
import { sectionPayload } from "@/lib/admin/site-settings-sections";

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

test("hero style: before migration 0042 a Home save drops it and keeps the rest", () => {
  assert.equal(LATE_COLUMNS.includes("hero_style"), true);
  const rest = withoutOverhaulColumns(sectionPayload("home", formOf({ hero_style: "slider", hero_eyebrow: "Illustrator" })));
  assert.equal("hero_style" in rest, false);
  assert.equal(rest.hero_eyebrow, "Illustrator");
});
```

Move the two `import` lines to the top of the file with the others.

- [ ] **Step 2: Run to verify they fail**

Run: `npx tsx --test src/lib/home.test.ts`
Expected: FAIL, `hero_style` is `undefined`.

- [ ] **Step 3: Migration**

<!-- file: supabase/migrations/0042_hero_style.sql -->
```sql
-- Home page hero: which hero the page shows.
--
--   hero_style  'wall'    the art wall, filled from the gallery images filed
--                         under published services (the default)
--               'slider'  the previous hero: the slides, image or video set
--                         in /admin/pages/home
--
-- The site reads a missing or unknown value as 'wall', so the code runs before
-- this is applied; until then the choice just can't be saved. Additive and
-- safe to run again.

alter table public.site_settings
  add column if not exists hero_style text not null default 'wall';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'site_settings_hero_style_check'
  ) then
    alter table public.site_settings
      add constraint site_settings_hero_style_check check (hero_style in ('wall', 'slider'));
  end if;
end $$;
```

- [ ] **Step 4: Row type and settings mapping**

In `src/lib/supabase/types.ts`, directly after the `hero_cta_secondary_url?: string | null;` line:

```ts
  // Added by migration 0042 — optional because a row may predate it.
  hero_style?: string | null;
```

In `src/lib/data/site-settings.ts`:

- add to the imports: `import { parseHeroStyle, type HeroStyle } from "@/lib/home";`
- in `type SiteSettings`, after `heroProofNote: string;`:

```ts
  /** Which hero the home page shows. The wall needs gallery images; see `heroMode`. */
  heroStyle: HeroStyle;
```

- in `placeholderSettings`, after `heroProofNote: "",`: `heroStyle: "wall",`
- in `mapRow`, after `heroProofNote: row.hero_proof_note ?? "",`: `heroStyle: parseHeroStyle(row.hero_style),`

- [ ] **Step 5: Save path**

In `src/lib/admin/site-settings-columns.ts`, replace the `LATE_COLUMNS` definition and the line above it:

```ts
/** Which home page hero is shown. Added by migration 0042. */
export const HERO_STYLE_COLUMNS = ["hero_style"] as const;

/** Every column a save can skip while its migration hasn't been run yet. */
export const LATE_COLUMNS: readonly string[] = [...OVERHAUL_COLUMNS, ...HERO_LINK_COLUMNS, ...HERO_STYLE_COLUMNS];
```

In `src/lib/admin/site-settings-sections.ts`, inside `buildSettingsPayload`, after the `hero_cta_secondary_url` line:

```ts
    // Migration 0042 — skipped on save until it is applied (see LATE_COLUMNS).
    hero_style: String(formData.get("hero_style") ?? "") === "slider" ? "slider" : "wall",
```

and in `SETTINGS_SECTIONS.home.columns`, change the first line to:

```ts
      "hero_headline", "hero_proof_note", "hero_eyebrow", "hero_intro", "hero_style",
```

- [ ] **Step 6: Admin field and notice**

In `src/app/admin/(dashboard)/pages/home/page.tsx`:

- change the headline field's hint to: `hint="What you do and for whom. Blank uses the default headline with the art wall, or the MJFIRD wordmark with the slider."`
- replace the opening of the "Hero image or video" section so the select comes first:

```tsx
        <FieldSection
          title="Hero image or video"
          description="The art wall fills itself from gallery images filed under your published services, in gallery order. The slider uses the media below."
        >
          <Field label="Hero style" hint="The wall needs at least six such gallery images; with fewer, the slider is shown.">
            <select name="hero_style" defaultValue={settings?.hero_style === "slider" ? "slider" : "wall"} className={fieldInputClasses}>
              <option value="wall">Art wall (from the gallery)</option>
              <option value="slider">Slider (the media below)</option>
            </select>
          </Field>
          <HeroMediaPicker
```

(the `HeroMediaPicker` props and the closing tags are unchanged).

In `src/components/admin/SettingsForm.tsx`, replace the pending notice's text with:

```tsx
          Saved, except fields that need a newer database migration (hero headline, proof note,
          FAQ, retainer, hero button links, hero style). Run the latest files in
          supabase/migrations (0034, 0041 and 0042) against your project, then save again.
```

- [ ] **Step 7: Run tests and type-check**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, no type errors. (`admin-settings-sections.test.ts` checks that every payload column belongs to exactly one screen; it passes because `hero_style` was added to both.)

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0042_hero_style.sql src/lib src/components/admin/SettingsForm.tsx "src/app/admin/(dashboard)/pages/home/page.tsx"
git commit -m "Hero style setting: art wall or slider, safe before migration 0042"
```

---

### Task 3: Art wall hero

**Files:**
- Create: `src/components/home/TiltCard.tsx`, `src/components/home/ArtWall.tsx`, `src/components/home/HomeHero.tsx`
- Modify: `src/app/globals.css` (inside `@layer components`, after the `.tone-invert` block; keyframes beside the existing ones), `src/components/media/SmartImage.tsx`, `src/app/(site)/page.tsx`

**Interfaces:**
- Consumes: `pickWallItems`, `wallColumns`, `heroMode`, `commissionStatus`, `heroFacts`, `STATUS_LABEL`, `DEFAULT_HERO_HEADLINE` (Task 1); `settings.heroStyle` (Task 2); existing `Lightbox`, `SmartImage`, `MagneticButton`, `ProofLine`, `Hero`.
- Produces:
  - `TiltCard({ children, className })` — wraps any block; adds the tilt and highlight.
  - `ArtWall({ items: GalleryItem[]; className?: string })`
  - `HomeHero({ eyebrow, headline, intro, ctaPrimary, ctaSecondary, ctaPrimaryHref, ctaSecondaryHref, status, facts, stats, proofNote, wall })`
  - `SmartImage` gains `lazy?: boolean`.

- [ ] **Step 1: Read the framework guides**

Read the image guide under `node_modules/next/dist/docs/01-app/` (search: `grep -ril "next/image" node_modules/next/dist/docs | head`). Confirm `fill`, `sizes`, `priority` and remote-host rules match how `SmartImage` uses them before changing it.

- [ ] **Step 2: Styles**

Add beside the existing `@keyframes` in `src/app/globals.css`:

```css
@keyframes wall-x {
  to {
    transform: translateX(-50%);
  }
}

@keyframes wall-y {
  to {
    transform: translateY(-50%);
  }
}

@keyframes word-rise {
  from {
    transform: translateY(112%);
  }
}
```

Add inside `@layer components`, after `.tone-invert { … }`:

```css
  /*
    Card tilt — the site's one signature gesture. A piece leans toward the
    pointer and a light moves across it, the way a foil card catches the lamp
    when you tilt it. `TiltCard` only sets these properties for a mouse and
    when motion is allowed, so touch and reduced-motion visitors get a still
    card with nothing to undo here.
  */
  .tilt-card {
    position: relative;
    transform: perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
    transition: transform var(--duration-expressive) var(--ease-freeze);
  }

  .tilt-card[data-tilting="true"] {
    transition-duration: var(--duration-fast);
  }

  .tilt-sheen {
    pointer-events: none;
    position: absolute;
    inset: 0;
    opacity: 0;
    background: radial-gradient(
      circle at var(--sheen-x, 50%) var(--sheen-y, 50%),
      rgb(255 255 255 / 0.34),
      transparent 58%
    );
    mix-blend-mode: soft-light;
    transition: opacity var(--duration-base) var(--ease-swing);
  }

  .tilt-card[data-tilting="true"] .tilt-sheen {
    opacity: 1;
  }

  /*
    Art wall. One set of tiles, two layouts.

    Narrow: the three tracks dissolve (`display: contents`) and every tile
    sits in one row that drifts left. The second copy of each tile is ordered
    after all the first copies, so the row is two identical halves and a
    -50% shift loops without a seam.

    Wide: the tracks are three columns, each its own vertical loop, the middle
    one running the other way. Tiles carry their spacing as a margin rather
    than a gap so that half a track is exactly one set of tiles.
  */
  .art-wall {
    overflow: hidden;
  }

  .art-wall-row {
    display: flex;
    width: max-content;
    animation: wall-x 110s linear infinite;
  }

  .art-wall-track {
    display: contents;
  }

  .art-wall-tile {
    flex: none;
    width: min(42vw, 13.5rem);
    margin-right: 0.75rem;
  }

  .art-wall-tile[data-clone] {
    order: 1;
  }

  .art-wall[data-paused="true"] .art-wall-row,
  .art-wall[data-paused="true"] .art-wall-track,
  .art-wall:focus-within .art-wall-row,
  .art-wall:focus-within .art-wall-track {
    animation-play-state: paused;
  }

  @media (hover: hover) {
    .art-wall:hover .art-wall-row,
    .art-wall:hover .art-wall-track {
      animation-play-state: paused;
    }
  }

  @media (min-width: 1024px) {
    .art-wall {
      /* Fades the panel's own edges; nothing is painted over the artwork. */
      mask-image: linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent);
    }

    .art-wall-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      column-gap: 1rem;
      width: auto;
      height: 100%;
      animation: none;
    }

    .art-wall-track {
      display: flex;
      flex-direction: column;
      animation: wall-y var(--wall-duration, 84s) linear infinite;
    }

    .art-wall-track[data-dir="down"] {
      animation-direction: reverse;
    }

    .art-wall-tile {
      width: 100%;
      margin-right: 0;
      margin-bottom: 1rem;
    }

    .art-wall-tile[data-clone] {
      order: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .art-wall-row,
    .art-wall-track {
      animation: none;
    }

    .art-wall-tile[data-clone] {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) and (max-width: 1023.98px) {
    /* No drift, so the row is scrolled by hand instead. */
    .art-wall {
      overflow-x: auto;
    }
  }

  /* Headline entrance: each word rises out of its own clipped box. */
  .word-rise {
    display: inline-block;
    overflow: hidden;
    vertical-align: bottom;
    padding-bottom: 0.12em;
    margin-bottom: -0.12em;
  }

  .word-rise > span {
    display: inline-block;
    animation: word-rise 0.7s var(--ease-freeze) both;
    animation-delay: calc(var(--word, 0) * 34ms + 80ms);
  }

  @media (prefers-reduced-motion: reduce) {
    .word-rise > span {
      animation: none;
    }
  }
```

- [ ] **Step 3: `SmartImage` lazy option**

In `src/components/media/SmartImage.tsx`, add the prop and use it on the plain image only (`next/image` is lazy by default):

```tsx
  priority,
  lazy = false,
}: {
```

```tsx
  priority?: boolean;
  /** Plain images only: defer loading until the image nears the viewport. */
  lazy?: boolean;
}) {
```

```tsx
    <img
      src={resolved}
      alt={alt}
      style={style}
      loading={lazy && !priority ? "lazy" : undefined}
      decoding={lazy ? "async" : undefined}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
```

- [ ] **Step 4: `TiltCard`**

<!-- file: src/components/home/TiltCard.tsx -->
```tsx
"use client";

import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

/**
 * Leans its contents toward the pointer and moves a highlight across them,
 * like tilting a foil card. Mouse only, and off under reduced motion: the
 * styles in `globals.css` do nothing until this sets its properties.
 */
export default function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reducedMotion || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.dataset.tilting = "true";
    el.style.setProperty("--tilt-x", `${(0.5 - y) * 9}deg`);
    el.style.setProperty("--tilt-y", `${(x - 0.5) * 11}deg`);
    el.style.setProperty("--sheen-x", `${x * 100}%`);
    el.style.setProperty("--sheen-y", `${y * 100}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.tilting;
    el.style.removeProperty("--tilt-x");
    el.style.removeProperty("--tilt-y");
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn("tilt-card", className)}>
      {children}
      <span aria-hidden="true" className="tilt-sheen" />
    </div>
  );
}
```

- [ ] **Step 5: `ArtWall`**

<!-- file: src/components/home/ArtWall.tsx -->
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Lightbox from "@/components/gallery/Lightbox";
import TiltCard from "@/components/home/TiltCard";
import SmartImage from "@/components/media/SmartImage";
import type { GalleryItem } from "@/lib/data/gallery";
import { wallColumns } from "@/lib/home";
import { cn } from "@/lib/cn";

// Slightly different speeds so the three columns never line up for long.
const DURATIONS = ["84s", "102s", "72s"];

/**
 * The hero's wall of commissions. Layout and drift are CSS (see `.art-wall`
 * in `globals.css`); this holds the lightbox state and stops the drift while
 * the wall is off screen.
 *
 * Every tile is rendered twice so each loop is seamless. The second copy, and
 * any tile repeated to pad a short column, is hidden from assistive technology
 * and from the tab order.
 */
export default function ArtWall({ items, className }: { items: GalleryItem[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;
  const columns = wallColumns(items);

  return (
    <div ref={ref} className={cn("art-wall", className)}>
      <div className="art-wall-row">
        {columns.map((column, c) => (
          <div
            key={c}
            className="art-wall-track"
            data-dir={c === 1 ? "down" : "up"}
            style={{ "--wall-duration": DURATIONS[c % DURATIONS.length] } as React.CSSProperties}
          >
            {[false, true].map((clone) =>
              column.map((tile, i) => {
                const hidden = clone || tile.repeat;
                const service = tile.item.services[0]?.title;
                return (
                  <button
                    key={`${clone ? "b" : "a"}-${i}`}
                    type="button"
                    data-clone={clone ? "" : undefined}
                    data-cursor="view"
                    aria-hidden={hidden || undefined}
                    tabIndex={hidden ? -1 : undefined}
                    aria-label={`Enlarge: ${tile.item.title || (service ? `${service} sample` : "artwork")}`}
                    onClick={() => setOpen(tile.index)}
                    className="art-wall-tile block"
                  >
                    <TiltCard className="aspect-[5/7] w-full overflow-hidden border border-line bg-bg-raised-2">
                      <SmartImage
                        src={tile.item.imageUrl}
                        alt=""
                        sizes="(min-width: 1024px) 16vw, 42vw"
                        priority={!hidden && tile.index < 3}
                        lazy={hidden || tile.index >= 6}
                      />
                    </TiltCard>
                  </button>
                );
              }),
            )}
          </div>
        ))}
      </div>

      {open !== null && (
        <Lightbox items={items} index={open} onClose={() => setOpen(null)} onIndexChange={setOpen} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: `HomeHero`**

<!-- file: src/components/home/HomeHero.tsx -->
```tsx
import { Fragment } from "react";
import ArtWall from "@/components/home/ArtWall";
import MagneticButton from "@/components/ui/MagneticButton";
import ProofLine from "@/components/ui/ProofLine";
import type { GalleryItem } from "@/lib/data/gallery";
import { STATUS_LABEL } from "@/lib/home";
import type { Availability } from "@/lib/services/storefront";
import { cn } from "@/lib/cn";

/*
  The offer beside the work. Copy keeps to the left of the sheet; the wall is
  a panel on the right from `lg` up and a drifting row under the buttons
  below that, so a phone's first screen carries artwork too.

  One source order serves both: copy, wall, numbers. On wide screens the wall
  is taken out of the flow and pinned to the section's right edge, which
  leaves the copy and the numbers stacked in the left column.
*/
export default function HomeHero({
  eyebrow,
  headline,
  intro,
  ctaPrimary,
  ctaSecondary,
  ctaPrimaryHref,
  ctaSecondaryHref,
  status,
  facts,
  stats,
  proofNote,
  wall,
}: {
  eyebrow: string;
  headline: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaPrimaryHref: string;
  ctaSecondaryHref: string;
  /** Whether commissions are being taken, across every service. Null hides the mark. */
  status: Availability | null;
  /** "From $15", "7+ days"… computed from the services. */
  facts: string[];
  stats: { value: number; suffix: string; label: string }[];
  proofNote: string;
  wall: GalleryItem[];
}) {
  const words = headline.split(/\s+/).filter(Boolean);

  return (
    <section className="relative -mt-[var(--nav-h)] overflow-hidden border-b border-line">
      {/* Not positioned on purpose: the wall below pins to the section. */}
      <div className="container-page flex flex-col justify-center pb-12 pt-[calc(var(--nav-h)+1.75rem)] lg:min-h-[max(88svh,44rem)] lg:pb-16 lg:pt-[calc(var(--nav-h)+3rem)]">
        <div className="flex flex-col items-start gap-6 lg:w-[46%] lg:gap-7">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {status && (
              <span className="spec inline-flex items-center gap-2.5 text-ink">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 rounded-full",
                    status === "open" ? "bg-accent motion-safe:animate-pulse" : "bg-ink-faint",
                  )}
                />
                {STATUS_LABEL[status]}
              </span>
            )}
            {eyebrow && <span className="spec hidden sm:inline">{eyebrow}</span>}
          </p>

          <h1 className="display-lg text-[clamp(2.125rem,1.3rem+2.9vw,3.75rem)]">
            {words.map((word, i) => (
              <Fragment key={i}>
                <span className="word-rise">
                  <span style={{ "--word": i } as React.CSSProperties}>{word}</span>
                </span>{" "}
              </Fragment>
            ))}
          </h1>

          {intro && <p className="max-w-md text-body text-pretty text-ink-muted sm:text-body-lg">{intro}</p>}

          {facts.length > 0 && (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
              {facts.map((fact, i) => (
                <li key={fact} className="flex items-center gap-4">
                  {i > 0 && <span aria-hidden="true" className="h-1 w-1 bg-accent" />}
                  {fact}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            <MagneticButton href={ctaPrimaryHref} size="lg" arrow cursorLabel="view">
              {ctaPrimary}
            </MagneticButton>
            <MagneticButton href={ctaSecondaryHref} size="lg" variant="secondary" cursorLabel="view">
              {ctaSecondary}
            </MagneticButton>
          </div>
        </div>

        <ArtWall
          items={wall}
          className={cn(
            // Narrow: a row in the flow, bled out to both screen edges.
            "-mx-5 mt-9 sm:-mx-8",
            // Wide: a panel from under the nav to the foot of the hero.
            "lg:absolute lg:bottom-0 lg:left-[52%] lg:right-0 lg:top-[var(--nav-h)] lg:mx-0 lg:mt-0 lg:pr-4",
          )}
        />

        <ProofLine stats={stats} note={proofNote} className="mt-9 w-full lg:mt-10 lg:w-[46%] lg:max-w-xl" />
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Wire the hero into the page**

In `src/app/(site)/page.tsx`:

- add imports:

```tsx
import HomeHero from "@/components/home/HomeHero";
import { getGalleryItems } from "@/lib/data/gallery";
import { DEFAULT_HERO_HEADLINE, commissionStatus, heroFacts, heroMode, pickWallItems } from "@/lib/home";
```

- load the gallery with the rest and compute the wall:

```tsx
  const [projects, services, testimonials, profile, settings, gallery] = await Promise.all([
    getProjects(),
    getStorefrontServices(),
    getTestimonials(),
    getProfile(),
    getSiteSettings(),
    getGalleryItems(),
  ]);
  const wall = pickWallItems(gallery, services.map((service) => service.slug));
  const hero = heroMode(settings.heroStyle, wall.length);
```

- replace the single `<Hero … />` element with:

```tsx
      {hero === "wall" ? (
        <HomeHero
          eyebrow={settings.heroEyebrow}
          headline={settings.heroHeadline || DEFAULT_HERO_HEADLINE}
          intro={settings.heroIntro}
          ctaPrimary={settings.heroCtaPrimary}
          ctaSecondary={settings.heroCtaSecondary}
          ctaPrimaryHref={settings.heroCtaPrimaryUrl}
          ctaSecondaryHref={settings.heroCtaSecondaryUrl}
          status={commissionStatus(services)}
          facts={heroFacts(services)}
          stats={settings.stats}
          proofNote={settings.heroProofNote}
          wall={wall}
        />
      ) : (
        <Hero
          mediaType={settings.heroMediaType}
          mediaUrl={settings.heroMediaUrl ?? ""}
          slides={settings.heroSlides}
          animation={settings.heroAnimation}
          slideDuration={settings.heroSlideDuration}
          eyebrow={settings.heroEyebrow}
          intro={settings.heroIntro}
          ctaPrimary={settings.heroCtaPrimary}
          ctaSecondary={settings.heroCtaSecondary}
          ctaPrimaryHref={settings.heroCtaPrimaryUrl}
          ctaSecondaryHref={settings.heroCtaSecondaryUrl}
          edgeLabel={settings.siteTitle}
          headline={settings.heroHeadline}
          stats={settings.stats}
          proofNote={settings.heroProofNote}
        />
      )}
```

- [ ] **Step 8: Verify**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: PASS.

Then run the page against live content (see Task 6, Step 1 for `.env.local`) and capture 1440×900 and 390×844. Check: three columns drift, the middle one downward; the loop has no visible jump; the phone row shows about two and a half tiles within the first screen; a tile opens the lightbox; hovering pauses the drift and tilts the tile. Adjust the headline size, column gap and hero height in `HomeHero` if the copy column is taller than the panel or the phone row falls below the first screen.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/components/home src/components/media/SmartImage.tsx "src/app/(site)/page.tsx"
git commit -m "Home hero: the offer beside a drifting wall of commissions"
```

---

### Task 4: Commission menu

**Files:**
- Create: `src/components/home/SampleStrip.tsx`, `src/components/home/CommissionMenu.tsx`
- Modify: `src/app/(site)/page.tsx`

**Interfaces:**
- Consumes: `packageLines`, `serviceSamples`, `fastestDelivery`, `orderLabel` (Task 1); `TiltCard` (Task 3); `StorefrontService`, `GalleryItem`; existing `AvailabilityBadge`, `MagneticButton`, `SmartImage`, `Lightbox`, `Reveal`, `startingPrice`, `formatUSD`, `effectiveAvailability`.
- Produces: `CommissionMenu({ services: StorefrontService[]; gallery: GalleryItem[] })`; `SampleStrip({ items: GalleryItem[]; label: string })`.

- [ ] **Step 1: `SampleStrip`**

<!-- file: src/components/home/SampleStrip.tsx -->
```tsx
"use client";

import { useState } from "react";
import Lightbox from "@/components/gallery/Lightbox";
import TiltCard from "@/components/home/TiltCard";
import SmartImage from "@/components/media/SmartImage";
import type { GalleryItem } from "@/lib/data/gallery";

/**
 * A service's samples: a four-across grid on wide screens, a strip that
 * scrolls sideways (and bleeds to the screen edges) on narrow ones. Each
 * opens the shared viewer, without its "commission this" link — the row it
 * sits in already has the order button.
 */
export default function SampleStrip({ items, label }: { items: GalleryItem[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <>
      <ul
        aria-label={`${label} samples`}
        className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:p-0"
      >
        {items.map((item, i) => (
          <li key={item.id} className="w-[38vw] max-w-[13rem] shrink-0 snap-start lg:w-auto lg:max-w-none">
            <button
              type="button"
              data-cursor="view"
              aria-label={`Enlarge: ${item.title || `${label} sample ${i + 1}`}`}
              onClick={() => setOpen(i)}
              className="block w-full"
            >
              <TiltCard className="aspect-[5/7] w-full overflow-hidden border border-line bg-bg-raised-2">
                <SmartImage src={item.imageUrl} alt="" sizes="(min-width: 1024px) 14vw, 38vw" lazy />
              </TiltCard>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <Lightbox
          items={items}
          index={open}
          onClose={() => setOpen(null)}
          onIndexChange={setOpen}
          showServices={false}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: `CommissionMenu`**

<!-- file: src/components/home/CommissionMenu.tsx -->
```tsx
import Link from "next/link";
import SampleStrip from "@/components/home/SampleStrip";
import SmartImage from "@/components/media/SmartImage";
import Reveal from "@/components/motion/Reveal";
import AvailabilityBadge from "@/components/services/AvailabilityBadge";
import MagneticButton from "@/components/ui/MagneticButton";
import type { GalleryItem } from "@/lib/data/gallery";
import type { StorefrontService } from "@/lib/data/services";
import { fastestDelivery, orderLabel, packageLines, serviceSamples } from "@/lib/home";
import { effectiveAvailability, formatUSD, startingPrice } from "@/lib/services/storefront";

/*
  The menu: every published commission as one row, with the three things a
  buyer weighs side by side — what it costs, what it looks like, how to order.
  The service cards this replaces on the home page showed one cover and a
  "from" price; the packages and the samples were a click away.
*/
export default function CommissionMenu({
  services,
  gallery,
}: {
  services: StorefrontService[];
  gallery: GalleryItem[];
}) {
  return (
    <div className="flex flex-col border-t border-line">
      {services.map((service) => (
        <MenuRow key={service.id} service={service} samples={serviceSamples(service, gallery)} />
      ))}
    </div>
  );
}

function MenuRow({ service, samples }: { service: StorefrontService; samples: GalleryItem[] }) {
  const href = `/services/${service.slug}`;
  const status = effectiveAvailability(service.availability, service.slotsTotal, service.slotsTaken);
  const from = startingPrice(service.packages);
  const days = fastestDelivery(service.packages);
  const { lines, more } = packageLines(service.packages);
  // One sample is not a strip: show the cover at its own shape instead.
  const showStrip = samples.length >= 2;
  const showCover = !showStrip && Boolean(service.coverUrl);
  const hasMedia = showStrip || showCover;

  return (
    <Reveal as="article" className="grid gap-8 border-b border-line py-10 lg:grid-cols-12 lg:gap-12 lg:py-14">
      <div className={hasMedia ? "flex flex-col gap-5 lg:col-span-5" : "flex flex-col gap-5 lg:col-span-12"}>
        <div className="flex flex-wrap items-center gap-3">
          <AvailabilityBadge
            availability={service.availability}
            slotsTotal={service.slotsTotal}
            slotsTaken={service.slotsTaken}
          />
          {service.category && <span className="mono-meta">{service.category}</span>}
        </div>

        <h3 className="display-md">
          <Link
            href={href}
            data-cursor="view"
            className="transition-colors duration-[var(--duration-fast)] hover:text-accent-strong"
          >
            {service.title}
          </Link>
        </h3>

        {service.description && (
          <p className="max-w-md text-body text-pretty text-ink-muted">{service.description}</p>
        )}

        {lines.length > 0 && (
          <div className="max-w-sm">
            <dl className="border-t border-line">
              {lines.map((line) => (
                <div key={line.name} className="flex items-baseline justify-between gap-6 border-b border-line py-2.5">
                  <dt className="text-body-sm text-ink">{line.name}</dt>
                  <dd className="text-body-sm font-medium tabular-nums text-ink">{line.price}</dd>
                </div>
              ))}
            </dl>
            {more > 0 && <p className="label pt-2.5">+{more} more</p>}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-4 pt-3">
          <MagneticButton href={href} arrow cursorLabel="view">
            {orderLabel(status)}
          </MagneticButton>
          <p className="text-body text-ink">
            {from !== null ? (
              <>
                <span className="text-ink-faint">From </span>
                {formatUSD(from)}
              </>
            ) : (
              <span className="text-ink-muted">Quote on request</span>
            )}
            {days !== null && <span className="text-ink-faint"> · {days}+ days</span>}
          </p>
          {service.hasGalleryWorks && (
            <Link
              href={`/gallery?service=${encodeURIComponent(service.slug)}`}
              className="label underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-ink"
            >
              See works
            </Link>
          )}
        </div>
      </div>

      {showStrip && (
        <div className="lg:col-span-7">
          <SampleStrip items={samples} label={service.title} />
        </div>
      )}

      {showCover && (
        <Link
          href={href}
          data-cursor="view"
          aria-label={`${service.title}: see the details`}
          className="relative block aspect-[4/3] overflow-hidden border border-line bg-bg-raised-2 lg:col-span-5 lg:col-start-8"
        >
          <SmartImage
            src={service.coverUrl!}
            alt=""
            sizes="(min-width: 1024px) 36vw, 100vw"
            lazy
            className="object-cover"
          />
        </Link>
      )}
    </Reveal>
  );
}
```

- [ ] **Step 3: Replace the home page's service cards**

In `src/app/(site)/page.tsx`:

- remove the `ServiceCard` import, the `SERVICES_TONE` constant with its comment, the `homeServices` line and the unused `cn` and `SectionTone` imports;
- add `import CommissionMenu from "@/components/home/CommissionMenu";`
- replace the whole services `SectionBand` block with:

```tsx
      {/* The menu: every commission with its price, its samples and its order button. */}
      {services.length > 0 && (
        <SectionBand id="commissions">
          <SectionHeader
            index={1}
            eyebrow={settings.servicesSectionEyebrow}
            title={settings.servicesSectionTitle}
            action={<MoreLink href="/services">All services</MoreLink>}
          />
          <CommissionMenu services={services} gallery={gallery} />
        </SectionBand>
      )}
```

and move it directly under the hero, above the featured work block. (Section numbers are finalised in Task 5.)

- [ ] **Step 4: Verify**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: PASS.

Capture the menu at 1440 and 390 against live content. Check: four rows; D&D and MTG show four samples; Pokémon and Emotes (fewer than two samples) show their cover in a 4:3 frame; on the phone the strip scrolls sideways and the page itself does not scroll horizontally (`document.documentElement.scrollWidth === window.innerWidth`).

- [ ] **Step 5: Commit**

```bash
git add src/components/home "src/app/(site)/page.tsx"
git commit -m "Home commission menu: every service with its packages, samples and order button"
```

---

### Task 5: Process, FAQ and the studio block

**Files:**
- Create: `src/components/home/HomeFaq.tsx`
- Modify: `src/components/reviews/Testimonials.tsx`, `src/app/(site)/page.tsx`

**Interfaces:**
- Consumes: `processAssurances`, `homeFaq`, `numberSections` (Task 1); existing `ProcessSteps`, `ServicesFaq`, `SectionBand`, `SectionHeader`, `FeaturedWork`, `RetainerBand`, `Testimonials`, `Reveal`.
- Produces: `HomeFaq({ index: number; items: { q: string; a: string }[] })`; `Testimonials` gains `limit?: number` (default 4).

- [ ] **Step 1: `Testimonials` limit**

In `src/components/reviews/Testimonials.tsx`:

```tsx
export default function Testimonials({ items, limit = 4 }: { items: Testimonial[]; limit?: number }) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  const cards = rest.slice(0, limit);
```

and change the comment's "up to four more" to "a few more".

- [ ] **Step 2: `HomeFaq`**

<!-- file: src/components/home/HomeFaq.tsx -->
```tsx
import Link from "next/link";
import SectionBand from "@/components/layout/SectionBand";
import Reveal from "@/components/motion/Reveal";
import ServicesFaq from "@/components/services/ServicesFaq";

/*
  The questions that stop an order. The heading holds its place beside the
  list on wide screens, so the section reads as a pair rather than as another
  full-width header over another full-width block.
*/
export default function HomeFaq({ index, items }: { index: number; items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <SectionBand id="faq">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="flex flex-col items-start gap-6 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:col-span-4 lg:self-start">
          <div className="flex w-full items-center gap-4 border-t border-line pt-4">
            <span className="mono-meta text-ink">{String(index).padStart(2, "0")}</span>
            <span className="eyebrow">FAQ</span>
          </div>
          <h2 className="display-md">Before you order</h2>
          <p className="text-body text-pretty text-ink-muted">
            Something else on your mind?{" "}
            <Link
              href="/contact"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-accent"
            >
              Ask me directly
            </Link>
            .
          </p>
        </Reveal>
        <div className="lg:col-span-8">
          <ServicesFaq items={items} />
        </div>
      </div>
    </SectionBand>
  );
}
```

- [ ] **Step 3: Final page assembly**

Replace the body of `Home` in `src/app/(site)/page.tsx` from the `Promise.all` to the end of the component with:

```tsx
  const [projects, services, testimonials, profile, settings, gallery] = await Promise.all([
    getProjects(),
    getStorefrontServices(),
    getTestimonials(),
    getProfile(),
    getSiteSettings(),
    getGalleryItems(),
  ]);
  // Four, not six: the commissions lead this page now, and the projects are
  // the way in for the second audience.
  const featured = projects.filter((p) => p.featured).slice(0, 4);
  const wall = pickWallItems(gallery, services.map((service) => service.slug));
  const hero = heroMode(settings.heroStyle, wall.length);
  const faq = homeFaq(settings.servicesFaq);
  const assurances = processAssurances(services);
  const number = numberSections({
    menu: services.length > 0,
    process: settings.processSteps.length > 0,
    faq: faq.length > 0,
    work: featured.length > 0,
    testimonials: testimonials.length > 0,
  });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile.name,
          description: profile.tagline,
          url: SITE_URL,
          sameAs: profile.socials.map((s) => s.url),
        }}
      />

      {/* hero block from Task 3, unchanged */}

      {/* The menu: every commission with its price, its samples and its order button. */}
      {number.menu > 0 && (
        <SectionBand id="commissions">
          <SectionHeader
            index={number.menu}
            eyebrow={settings.servicesSectionEyebrow}
            title={settings.servicesSectionTitle}
            action={<MoreLink href="/services">All services</MoreLink>}
          />
          <CommissionMenu services={services} gallery={gallery} />
        </SectionBand>
      )}

      {/* How a commission runs — the flipped sheet, so it reads as a pause between the two halves. */}
      {number.process > 0 && (
        <SectionBand tone="invert" id="process">
          <SectionHeader
            index={number.process}
            eyebrow={settings.processSectionEyebrow}
            title={settings.processSectionTitle}
          />
          <ProcessSteps steps={settings.processSteps} />
          <ul className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:flex-wrap sm:gap-x-10">
            {assurances.map((line) => (
              <li key={line} className="flex items-center gap-3 text-body-sm text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-accent" />
                {line}
              </li>
            ))}
          </ul>
        </SectionBand>
      )}

      <HomeFaq index={number.faq} items={faq} />

      {/* From here down the page speaks to studios and brands: projects, the retainer, their words. */}
      {number.work > 0 && (
        <SectionBand id="work">
          <SectionHeader
            index={number.work}
            eyebrow={settings.workSectionEyebrow}
            title={settings.workSectionTitle}
            action={<MoreLink href="/work">All work</MoreLink>}
          />
          <FeaturedWork projects={featured} />
        </SectionBand>
      )}

      {/* The one accent band on the page. */}
      <RetainerBand settings={settings} />

      {number.testimonials > 0 && (
        <SectionBand>
          <SectionHeader
            index={number.testimonials}
            eyebrow={settings.testimonialsSectionEyebrow}
            title={settings.testimonialsSectionTitle}
          />
          <Testimonials items={testimonials} limit={2} />
        </SectionBand>
      )}
    </>
  );
```

Keep the hero block from Task 3 where the comment marks it. Add the imports this needs:

```tsx
import HomeFaq from "@/components/home/HomeFaq";
import ProcessSteps from "@/components/services/ProcessSteps";
import {
  DEFAULT_HERO_HEADLINE,
  commissionStatus,
  heroFacts,
  heroMode,
  homeFaq,
  numberSections,
  pickWallItems,
  processAssurances,
} from "@/lib/home";
```

and remove `Reveal` from the imports if it is no longer used in this file. The slider hero's corner link points at `#work`, which still exists.

- [ ] **Step 4: Verify**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HomeFaq.tsx src/components/reviews/Testimonials.tsx "src/app/(site)/page.tsx"
git commit -m "Home: process, FAQ, then the studio block of projects, retainer and testimonials"
```

---

### Task 6: Verification against live content

**Files:**
- Modify: anything the checks show needs fixing; the spec, if what shipped differs from it.

- [ ] **Step 1: Run locally on live content, read-only**

Create `.env.local` (git-ignored; confirm with `git check-ignore .env.local`) holding the project's public URL and publishable (anon) key only:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=<project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

No service-role key. The public client can only read published rows.
Run: `npm run build && npm run start`

- [ ] **Step 2: Capture**

With Playwright (`--trace off` is not needed for a plain script), capture `/` full-page at 1440×900 and 390×844, light and dark (`colorScheme`), scrolling through the page first so reveals and lazy images settle. Record `document.documentElement.scrollHeight` at 390.
Expected: phone height ≤ 9,586px. If it is taller, reduce the menu rows' vertical padding and the process steps' gap on narrow screens until it is not.

- [ ] **Step 3: Behaviour checks, each as a Playwright assertion**

- `document.documentElement.scrollWidth === window.innerWidth` at 390 and 1440.
- At 390×844, the first wall tile's top edge is above 844.
- Reduced motion (`reducedMotion: "reduce"`): `getComputedStyle` of `.art-wall-row` and `.art-wall-track` reports `animation-name: none`, and no `[data-clone]` tile is displayed.
- Keyboard: Tab from the second hero button reaches a wall tile; Enter opens the dialog; Escape closes it; no element with `aria-hidden="true"` receives focus while tabbing through the hero.
- `/services` renders the same as on `main` (compare a screenshot taken before Task 3 with one taken now).
- Slider fallback: with `NEXT_PUBLIC_SUPABASE_URL` unset the home page renders the slider hero and the placeholder services without errors in the console.

- [ ] **Step 4: Full checks**

Run: `npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Keep the spec true**

Re-read the spec against what shipped. If the visual pass changed anything it states (sizes, counts, section order), edit the spec to match in the same commit.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "Home page: verification fixes and spec deviations"
git push -u origin claude/zen-goldberg-bsad0s
```

Update the pull request description with the before/after captures' findings, the phone height before and after, and the note that migration 0042 has not been applied.
