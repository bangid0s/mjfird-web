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

/**
 * A service row's package list: the first few in stored order, then how many
 * more. `showsLowest` says whether the listed lines include the cheapest
 * package — when they don't, the row must still print its "From" price.
 */
export function packageLines(
  packages: ServicePackage[],
  max = 3,
): { lines: { name: string; price: string }[]; more: number; showsLowest: boolean } {
  const listed = packages.slice(0, max);
  const lowest = packages.length > 0 ? Math.min(...packages.map((p) => p.price)) : null;
  return {
    lines: listed.map((p) => ({ name: p.name, price: formatUSD(p.price) })),
    more: Math.max(0, packages.length - max),
    showsLowest: lowest !== null && listed.some((p) => p.price === lowest),
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
  // A quote-only service lists no packages, so it makes no promise either way.
  const priced = services.filter((s) => s.packages.length > 0);
  const everySketch =
    priced.length > 0 &&
    priced.every((s) => s.packages.some((p) => p.features.some((feature) => /sketch/i.test(feature))));
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
