/*
  Project packages for studios and creators: fixed scope, fixed price, paid
  in milestones. Prices are what the same pieces cost as single commissions
  with the commercial license (+100%), less a volume discount, rounded to $5.
  The payment split follows terms section 4: under USD 150 upfront,
  USD 150–1,000 in two halves, above that 40/30/30.
*/

export type StudioPackage = {
  id: string;
  name: string;
  pitch: string;
  pieces: string;
  /** One-off price of one piece with the commercial license; null = by quote. */
  unitValue: number | null;
  count: number;
  discount: number;
  timeline: string;
  includes: string[];
  bestFor: string;
  /** Preselects the inquiry form. */
  projectType: "character" | "card-art" | "other";
};

export const STUDIO_PACKAGES: StudioPackage[] = [
  {
    id: "character-cast",
    name: "Character Cast",
    pitch: "A whole party or cast, drawn as one consistent set.",
    pieces: "5 full-body characters",
    unitValue: 140, // full body $70 + commercial 100%
    count: 5,
    discount: 0.1,
    timeline: "About 4 weeks",
    includes: [
      "5 full-body character illustrations",
      "One style and palette across the cast",
      "Sketch approval before color on each piece",
      "Commercial use for your products and promotion",
    ],
    bestFor: "TTRPG campaigns and live-play shows, VTuber groups, game casts.",
    projectType: "character",
  },
  {
    id: "card-set-10",
    name: "Card Set 10",
    pitch: "Ten card illustrations for a deck, an expansion or a Kickstarter.",
    pieces: "10 card illustrations",
    unitValue: 120, // half body $60 + commercial 100%
    count: 10,
    discount: 0.1,
    timeline: "6–8 weeks",
    includes: [
      "10 card illustrations, framed for card art",
      "One art direction across the set",
      "Delivered in batches you can review as they come",
      "Commercial use, including print runs and crowdfunding",
    ],
    bestFor: "Indie TCGs, card game prototypes and crowdfunding campaigns.",
    projectType: "card-art",
  },
  {
    id: "card-set-20",
    name: "Card Set 20",
    pitch: "A full set of twenty, planned and delivered over a quarter.",
    pieces: "20 card illustrations",
    unitValue: 120,
    count: 20,
    discount: 0.15,
    timeline: "About 3 months",
    includes: [
      "20 card illustrations, framed for card art",
      "A style guide agreed at the start, kept across the set",
      "Delivered in batches, one milestone at a time",
      "Commercial use, including print runs and crowdfunding",
    ],
    bestFor: "Card games and Kickstarters that need a complete, consistent set.",
    projectType: "card-art",
  },
  {
    id: "custom-project",
    name: "Custom project",
    pitch: "Key art, a campaign kit, brand and event design, or a mix.",
    pieces: "Scoped with you",
    unitValue: null,
    count: 0,
    discount: 0,
    timeline: "Set in the quotation",
    includes: [
      "Scope, schedule and price agreed in a quotation",
      "Illustration and graphic design in one place",
      "Milestones sized to the project",
      "Commercial use as agreed",
    ],
    bestFor: "Publishers, brands, events and anything that doesn't fit a package.",
    projectType: "other",
  },
];

/** Package price, or null when it's by quote. */
export function packagePrice(pkg: Pick<StudioPackage, "unitValue" | "count" | "discount">): number | null {
  if (pkg.unitValue === null) return null;
  return Math.round((pkg.unitValue * pkg.count * (1 - pkg.discount)) / 5) * 5;
}

/** Payment split from terms section 4, as percentages. */
export function milestoneSplit(total: number): number[] {
  if (total < 150) return [100];
  if (total <= 1000) return [50, 50];
  return [40, 30, 30];
}

/** "50% to start, 50% before final files" style wording. */
export function milestoneLabel(total: number): string {
  const split = milestoneSplit(total);
  if (split.length === 1) return "Paid upfront";
  if (split.length === 2) return "50% to start, 50% before final files";
  return "40% to start, 30% at the midpoint, 30% before final files";
}

/** Rough budget bucket for the inquiry form. */
export function budgetBucket(total: number | null): string {
  if (total === null) return "";
  if (total < 100) return "<100";
  if (total <= 500) return "100-500";
  if (total < 2000) return "500-2k";
  return "2k+";
}

/** Prefilled inquiry text when someone starts from a package. */
export function packageInquiryMessage(packageId: string | undefined): string {
  const pkg = STUDIO_PACKAGES.find((p) => p.id === packageId);
  const head = pkg ? `I'm interested in the ${pkg.name} package (${pkg.pieces}).` : "I'm planning an illustration project.";
  return [
    head,
    "",
    "Studio / company:",
    "What we're making (game, campaign, channel, brand):",
    "Number of pieces:",
    "Deadline or launch date:",
    "Where the art will be used (print, Kickstarter, stream, merch):",
    "Links (website, campaign page, style references):",
  ].join("\n");
}
