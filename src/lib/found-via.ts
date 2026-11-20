/**
 * "How did you find me?" — asked on the contact form and on every commission
 * request, so each lead can be traced back to the channel that brought it.
 * Values are stored as-is; keep them stable so old rows still group together.
 */
export const FOUND_VIA = [
  { value: "google", label: "Google search" },
  { value: "ai-assistant", label: "AI assistant (ChatGPT, Claude, Perplexity…)" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X / Twitter" },
  { value: "threads", label: "Threads" },
  { value: "vgen", label: "VGen" },
  { value: "artstation", label: "ArtStation" },
  { value: "discord", label: "Discord" },
  { value: "referral", label: "Someone recommended you" },
  { value: "returning", label: "I've worked with you before" },
  { value: "other", label: "Somewhere else" },
] as const;

export type FoundVia = (typeof FOUND_VIA)[number]["value"];

export const FOUND_VIA_QUESTION = "How did you find me?";

/** The id the answer is stored under in a commission request's answers. */
export const FOUND_VIA_ANSWER_ID = "found_via";

export function isFoundVia(value: unknown): value is FoundVia {
  return FOUND_VIA.some((o) => o.value === value);
}

export function foundViaLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return FOUND_VIA.find((o) => o.value === value)?.label ?? value;
}
