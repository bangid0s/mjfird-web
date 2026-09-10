import { cn } from "@/lib/cn";

export type SectionTone = "none" | "sand" | "mint" | "lilac" | "rose" | "solid";

const TONE_CLASS: Record<SectionTone, string> = {
  none: "",
  sand: "tone tone-sand",
  mint: "tone tone-mint",
  lilac: "tone tone-lilac",
  rose: "tone tone-rose",
  solid: "tone-solid",
};

/**
 * A full-bleed band with the page container inside it.
 *
 * Sections used to declare their own background and padding one by one, which
 * is how a page ends up with four slightly different section rhythms. This
 * keeps the band, the gutter and the vertical rhythm in one place, and takes
 * the colour as a prop — see the tone rules in `globals.css` for which
 * sections should carry one.
 */
export default function SectionBand({
  tone = "none",
  size = "section",
  className,
  children,
}: {
  tone?: SectionTone;
  /** "compact" is for stat strips and other one-line bands. */
  size?: "section" | "compact";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(TONE_CLASS[tone], className)}>
      <div
        className={cn(
          "container-page",
          size === "section" ? "py-[var(--space-section)]" : "py-14",
        )}
      >
        {children}
      </div>
    </section>
  );
}
