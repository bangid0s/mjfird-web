export const PROJECT_TYPES = [
  { value: "character", label: "Character illustration" },
  { value: "card-art", label: "Card / TCG art" },
  { value: "brand", label: "Brand identity" },
  { value: "retainer", label: "Monthly retainer" },
  { value: "other", label: "Something else" },
] as const;

export const BUDGETS = [
  { value: "<100", label: "Under $100" },
  { value: "100-500", label: "$100 – $500" },
  { value: "500-2k", label: "$500 – $2,000" },
  { value: "2k+", label: "$2,000+" },
  { value: "retainer", label: "Monthly retainer" },
] as const;

/** `/contact?type=retainer` preselects the retainer in both selects. */
export function inquiryPreselect(type: unknown): { projectType: string; budget: string } {
  return type === "retainer" ? { projectType: "retainer", budget: "retainer" } : { projectType: "", budget: "" };
}
