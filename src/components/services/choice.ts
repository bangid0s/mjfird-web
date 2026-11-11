import { cn } from "@/lib/cn";

/*
  Selectable option boxes (package, license). The chosen one is filled with
  the accent color — not just outlined — so it reads at a glance.
*/
export function choiceBox(checked: boolean, className?: string) {
  return cn(
    "flex cursor-pointer border transition-colors duration-[var(--duration-fast)]",
    checked ? "border-accent bg-accent text-accent-ink" : "border-line hover:border-line-strong",
    className,
  );
}

/** Main line text inside a choice box. */
export const choiceTitle = (checked: boolean) => (checked ? "text-accent-ink" : "text-ink");
/** Secondary text inside a choice box. */
export const choiceMuted = (checked: boolean) => (checked ? "text-accent-ink/80" : "text-ink-muted");
/** Radio dot: light on the filled box, accent on the plain one. */
export const choiceRadio = (checked: boolean) =>
  cn("h-4 w-4 shrink-0", checked ? "accent-[var(--color-accent-ink)]" : "accent-[var(--color-accent)]");
