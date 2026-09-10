import { cn } from "@/lib/cn";

export type SectionTone = "none" | "accent" | "invert";

const TONE_CLASS: Record<SectionTone, string> = {
  none: "",
  /** Filled with the site accent. One per page, as punctuation. */
  accent: "tone-accent",
  /** The opposite sheet: dark on a light page, light on a dark page. */
  invert: "tone-invert",
};

/**
 * A full-bleed band with the page container inside it.
 *
 * Sections used to declare their own background and padding one by one, which
 * is how a page ends up with four slightly different section rhythms. This
 * keeps the band, the gutter and the vertical rhythm in one place, and takes
 * the colour as a prop.
 *
 * A band that carries colour carries the *accent* — there is no separate tint
 * palette. See the tone rules in `globals.css`.
 */
export default function SectionBand({
  id,
  tone = "none",
  size = "section",
  className,
  children,
}: {
  id?: string;
  tone?: SectionTone;
  /** "compact" is for stat strips and other one-line bands. */
  size?: "section" | "compact";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn(TONE_CLASS[tone], className)}>
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
