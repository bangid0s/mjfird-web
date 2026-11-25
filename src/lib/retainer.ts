/*
  Monthly retainer plans. One-off value is what the same work costs as single
  commissions with the commercial license (+100%), which every retainer
  includes. Term discounts match terms section 10: 12 months −15%, 6 months
  −10%, a 3-month starter −5%. Prices are "from": the agreement sets the final
  number.
*/

export type RetainerTerm = { months: 12 | 6 | 3; label: string; discount: number };

export const RETAINER_TERMS: RetainerTerm[] = [
  { months: 12, label: "12 months", discount: 0.15 },
  { months: 6, label: "6 months", discount: 0.1 },
  { months: 3, label: "3-month starter", discount: 0.05 },
];

export type RetainerPlan = {
  id: string;
  name: string;
  /** One line under the name. */
  pitch: string;
  /** Monthly value of the same work as one-off commissions, commercial license included. */
  oneOffValue: number;
  includes: string[];
  bestFor: string;
};

export const RETAINER_PLANS: RetainerPlan[] = [
  {
    id: "character-monthly",
    name: "Character Monthly",
    pitch: "Two finished characters every month.",
    // 2 × full body $70, commercial +100%
    oneOffValue: 280,
    includes: [
      "2 full-body character illustrations a month",
      "Sketch approval before color on each piece",
      "Commercial use for your products and promotion",
      "Priority slot ahead of one-off orders",
    ],
    bestFor: "Campaigns, live-play shows and VTuber channels adding a character or two a month.",
  },
  {
    id: "card-art-batch",
    name: "Card Art Batch",
    pitch: "A steady run of card illustrations in one consistent style.",
    // 4 × half body $60, commercial +100%
    oneOffValue: 480,
    includes: [
      "4 card illustrations a month (half-body framing, sized for card art)",
      "One art direction kept consistent across the whole set",
      "Commercial use, including print runs and crowdfunding",
      "Priority slot ahead of one-off orders",
    ],
    bestFor: "Indie TCGs and Kickstarter card games building a set month by month.",
  },
  {
    id: "campaign-partner",
    name: "Campaign Partner",
    pitch: "Your ongoing illustrator, for whatever the month needs.",
    // 4 × full body $70, commercial +100%
    oneOffValue: 560,
    includes: [
      "4 full-body illustrations a month, or the equal mix of characters, card art, emotes and design",
      "A monthly planning check-in",
      "Commercial use for your products and promotion",
      "First place in my queue",
    ],
    bestFor: "Publishers, studios and brands with a content calendar to fill.",
  },
];

/** Monthly price for a plan on a term, rounded to the nearest $5. */
export function monthlyPrice(plan: Pick<RetainerPlan, "oneOffValue">, term: Pick<RetainerTerm, "discount">): number {
  return Math.round((plan.oneOffValue * (1 - term.discount)) / 5) * 5;
}

/** The headline "from" price: the 12-month rate. */
export function fromPrice(plan: Pick<RetainerPlan, "oneOffValue">): number {
  return monthlyPrice(plan, RETAINER_TERMS[0]);
}

/** Prefilled inquiry text when someone starts from a plan. */
export function planInquiryMessage(planId: string | undefined): string {
  const plan = RETAINER_PLANS.find((p) => p.id === planId);
  const head = plan ? `I'm interested in the ${plan.name} retainer.` : "I'm interested in a monthly retainer.";
  return [
    head,
    "",
    "Studio / company:",
    "What we're making (game, campaign, channel, brand):",
    "Pieces per month:",
    "Term (3, 6 or 12 months):",
    "Ideal start date:",
    "Links (website, Kickstarter, style references):",
  ].join("\n");
}
