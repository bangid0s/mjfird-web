import { z } from "zod";

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

const inquirySchema = z.object({
  name: z.string().min(1, "Tell me your name."),
  email: z.string().email("That email doesn't look right."),
  projectType: z.string().min(1, "Pick what this is about."),
  budget: z.string().min(1, "Pick a rough budget range."),
  message: z
    .string()
    .min(20, "Give me at least a couple of sentences.")
    .max(5000, "That is over 5,000 characters. Please shorten it."),
  company: z.string().max(0, ""), // honeypot
});

export type InquiryValues = z.infer<typeof inquirySchema>;
export type InquiryErrors = Partial<Record<keyof InquiryValues, string>>;

/**
 * Validates the inquiry form. Every field is defaulted to "" first: a select
 * left on its disabled placeholder is missing from FormData altogether, and a
 * missing key would otherwise surface as zod's own "expected string" message.
 */
export function validateInquiry(
  values: Record<string, unknown>,
): { ok: true; data: InquiryValues } | { ok: false; errors: InquiryErrors } {
  const parsed = inquirySchema.safeParse({
    name: "",
    email: "",
    projectType: "",
    budget: "",
    message: "",
    company: "",
    ...values,
  });
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: InquiryErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof InquiryErrors;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
