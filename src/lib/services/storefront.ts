import { z } from "zod";

/*
  Shapes for the commission storefront (packages, add-ons, FAQ, request-form
  questions). They live in jsonb columns on `services`, so every read and write
  goes through these schemas: a malformed entry is dropped rather than breaking
  the page. Prices are USD with up to two decimals.

  Pricing is deliberately computed here, from the stored service, so the server
  (and later the PayPal order) never trusts a total sent by the browser.
*/

const money = z.coerce.number().finite().min(0).max(100_000).transform((n) => Math.round(n * 100) / 100);
const shortText = z.string().trim().max(200);
const id = z.string().trim().min(1).max(64);

/** Hard cap on extra characters per request (the database enforces the same). */
export const MAX_EXTRA_CHARACTERS = 20;

export const packageSchema = z.object({
  id,
  name: shortText.min(1),
  description: z.string().trim().max(2000).default(""),
  price: money,
  delivery_days: z.coerce.number().int().min(0).max(365).default(0),
  revisions: z.coerce.number().int().min(0).max(99).default(0),
  features: z.array(shortText.min(1)).max(30).default([]),
  /**
   * How many characters a client may add on top of the one the package
   * includes. 0 = not offered. Each extra character costs the package price
   * again: +1 doubles it, +2 triples it.
   */
  extra_characters_max: z.coerce.number().int().min(0).max(MAX_EXTRA_CHARACTERS).default(0),
});

export const addonSchema = z.object({
  id,
  name: shortText.min(1),
  description: z.string().trim().max(1000).default(""),
  price: money,
});

/*
  Background options. Unlike add-ons (tick any number), the client picks exactly
  one, as a radio list: e.g. "No background" $0, "Simple" $15, "Detailed scene"
  $40. The price is flat (not multiplied by characters). An empty list means the
  service doesn't offer a background choice. The first option is the default,
  so put the free / cheapest one first.
*/
export const backgroundSchema = z.object({
  id,
  name: shortText.min(1),
  description: z.string().trim().max(1000).default(""),
  price: money,
});

export const faqSchema = z.object({
  q: z.string().trim().min(1).max(300),
  a: z.string().trim().min(1).max(3000),
});

export const QUESTION_TYPES = ["short", "long", "select", "checkbox", "file"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questionSchema = z.object({
  id,
  label: shortText.min(1),
  type: z.enum(QUESTION_TYPES).default("short"),
  options: z.array(shortText.min(1)).max(30).default([]),
  required: z.boolean().default(false),
  help: z.string().trim().max(300).default(""),
});

/*
  Usage licenses (like VGen's request form). Every service has the same three
  tiers in a fixed order; the admin can rename them, change the surcharge or
  switch the paid ones off. Personal use is the default and is always offered.
  The surcharge is a percentage of the order total (package × characters +
  add-ons + background): monetized +50%, commercial +100% unless the service says otherwise.
*/
export const LICENSE_IDS = ["personal", "monetized", "commercial"] as const;
export type LicenseId = (typeof LICENSE_IDS)[number];

export const licenseSchema = z.object({
  id: z.enum(LICENSE_IDS),
  name: shortText.min(1),
  description: z.string().trim().max(500).default(""),
  percent: z.coerce.number().finite().min(0).max(500).transform((n) => Math.round(n * 100) / 100),
  enabled: z.boolean().default(true),
});
export type ServiceLicense = z.infer<typeof licenseSchema>;

export const DEFAULT_LICENSES: ServiceLicense[] = [
  { id: "personal", name: "Personal use", description: "Profile pictures, personal posts, gifts. No income from the art.", percent: 0, enabled: true },
  { id: "monetized", name: "Monetized content", description: "Streams, YouTube, Patreon, emotes, alerts — content that earns you money.", percent: 50, enabled: true },
  { id: "commercial", name: "Commercial merchandising", description: "Printed or sold products: merch, prints, packaging, ads.", percent: 100, enabled: true },
];

/**
 * The service's three licenses, stored values laid over the defaults (so a
 * service saved before licenses existed gets the defaults). Personal use is
 * always enabled.
 */
export function parseLicenses(raw: unknown): ServiceLicense[] {
  const stored = parseList(licenseSchema, raw);
  return DEFAULT_LICENSES.map((d) => {
    const own = stored.find((l) => l.id === d.id);
    const merged = own ? { ...d, ...own } : { ...d };
    return d.id === "personal" ? { ...merged, enabled: true } : merged;
  });
}

/** The licenses a client can pick from. */
export function offeredLicenses(licenses: ServiceLicense[]) {
  return licenses.filter((l) => l.enabled);
}

export const AVAILABILITY = ["open", "waitlist", "closed"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export type ServicePackage = z.infer<typeof packageSchema>;
export type ServiceAddon = z.infer<typeof addonSchema>;
export type ServiceBackground = z.infer<typeof backgroundSchema>;
export type ServiceFaq = z.infer<typeof faqSchema>;
export type ServiceQuestion = z.infer<typeof questionSchema>;

/** Parse a jsonb array, keeping only the entries that validate. */
export function parseList<T>(schema: z.ZodType<T>, raw: unknown): T[] {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function startingPrice(packages: ServicePackage[]): number | null {
  if (packages.length === 0) return null;
  return Math.min(...packages.map((p) => p.price));
}

/** Slots left, or null when the service has no slot limit. */
export function slotsLeft(total: number | null, taken: number): number | null {
  if (total === null) return null;
  return Math.max(0, total - taken);
}

/**
 * The effective status a client sees: an "open" service whose slots are all
 * taken reads as waitlist, so the badge can never promise a slot that is gone.
 */
export function effectiveAvailability(
  availability: Availability,
  total: number | null,
  taken: number,
): Availability {
  if (availability === "open" && slotsLeft(total, taken) === 0) return "waitlist";
  return availability;
}

export type PriceQuote = {
  packageId: string;
  addonIds: string[];
  /** Characters on top of the one the package includes. */
  extraCharacters: number;
  /** Package price × every character (1 + extraCharacters). */
  subtotal: number;
  addonsTotal: number;
  /** The chosen background, or null when the service offers none. */
  backgroundId: string | null;
  backgroundPrice: number;
  licenseId: LicenseId;
  licensePercent: number;
  /** licensePercent of (subtotal + addonsTotal + backgroundPrice). */
  licenseFee: number;
  total: number;
};

/** Clamp a requested extra-character count to what the package allows. */
export function clampExtraCharacters(pkg: ServicePackage | undefined, requested: unknown): number {
  const n = Math.floor(Number(requested));
  if (!pkg || !Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, pkg.extra_characters_max);
}

/**
 * Price a selection against the stored service. Unknown package → null;
 * unknown add-on ids are ignored; extra characters are clamped to the
 * package's limit; an unknown or disabled license falls back to personal use;
 * an unknown background falls back to the service's first one. Use this on the
 * server for anything that moves money.
 */
export function quote(
  packages: ServicePackage[],
  addons: ServiceAddon[],
  packageId: string,
  addonIds: string[],
  extraCharacters = 0,
  licenses: ServiceLicense[] = DEFAULT_LICENSES,
  licenseId: string = "personal",
  backgrounds: ServiceBackground[] = [],
  backgroundId: string = "",
): PriceQuote | null {
  const pkg = packages.find((p) => p.id === packageId);
  if (!pkg) return null;
  const extra = clampExtraCharacters(pkg, extraCharacters);
  const chosen = addons.filter((a) => addonIds.includes(a.id));
  const addonsTotal = Math.round(chosen.reduce((sum, a) => sum + a.price, 0) * 100) / 100;
  const subtotal = Math.round(pkg.price * (1 + extra) * 100) / 100;
  // Unknown or switched-off license → personal use.
  const license =
    offeredLicenses(licenses).find((l) => l.id === licenseId) ??
    licenses.find((l) => l.id === "personal") ??
    DEFAULT_LICENSES[0];
  const background = backgrounds.find((b) => b.id === backgroundId) ?? backgrounds[0] ?? null;
  const backgroundPrice = background?.price ?? 0;
  const base = Math.round((subtotal + addonsTotal + backgroundPrice) * 100) / 100;
  const licenseFee = Math.round(base * license.percent) / 100;
  return {
    packageId: pkg.id,
    addonIds: chosen.map((a) => a.id),
    extraCharacters: extra,
    subtotal,
    addonsTotal,
    backgroundId: background?.id ?? null,
    backgroundPrice,
    licenseId: license.id,
    licensePercent: license.percent,
    licenseFee,
    total: Math.round((base + licenseFee) * 100) / 100,
  };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}
