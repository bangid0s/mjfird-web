import { Fragment } from "react";
import ArtWall from "@/components/home/ArtWall";
import MagneticButton from "@/components/ui/MagneticButton";
import ProofLine from "@/components/ui/ProofLine";
import type { GalleryItem } from "@/lib/data/gallery";
import { STATUS_LABEL, wallColumns } from "@/lib/home";
import type { Availability } from "@/lib/services/storefront";
import { cn } from "@/lib/cn";

/*
  The offer beside the work. Copy keeps to the left of the sheet; the wall is
  a panel on the right from `lg` up and a drifting row under the buttons
  below that, so a phone's first screen carries artwork too.

  One source order serves both: copy, wall, numbers. On wide screens the wall
  is taken out of the flow and pinned to the section's right edge, which
  leaves the copy and the numbers stacked in the left column.
*/
export default function HomeHero({
  eyebrow,
  headline,
  intro,
  ctaPrimary,
  ctaSecondary,
  ctaPrimaryHref,
  ctaSecondaryHref,
  status,
  facts,
  stats,
  proofNote,
  wall,
}: {
  eyebrow: string;
  headline: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaPrimaryHref: string;
  ctaSecondaryHref: string;
  /** Whether commissions are being taken, across every service. Null hides the mark. */
  status: Availability | null;
  /** "From $15", "7+ days"… computed from the services. */
  facts: string[];
  stats: { value: number; suffix: string; label: string }[];
  proofNote: string;
  wall: GalleryItem[];
}) {
  const words = headline.split(/\s+/).filter(Boolean);

  return (
    <section className="relative -mt-[var(--nav-h)] overflow-hidden border-b border-line">
      {/* Not positioned on purpose: the wall below pins to the section. */}
      <div className="container-page flex flex-col justify-center pb-12 pt-[calc(var(--nav-h)+1.75rem)] lg:min-h-[max(88svh,44rem)] lg:pb-16 lg:pt-[calc(var(--nav-h)+3rem)]">
        <div className="flex flex-col items-start gap-6 lg:w-[46%] lg:gap-7">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {status && (
              <span className="spec inline-flex items-center gap-2.5 text-ink">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 rounded-full",
                    status === "open" ? "bg-accent motion-safe:animate-pulse" : "bg-ink-faint",
                  )}
                />
                {STATUS_LABEL[status]}
              </span>
            )}
            {eyebrow && <span className="spec hidden sm:inline">{eyebrow}</span>}
          </p>

          <h1 className="display-lg text-[clamp(2.125rem,1.3rem+2.9vw,3.75rem)]">
            {words.map((word, i) => (
              <Fragment key={i}>
                <span className="word-rise">
                  <span style={{ "--word": i } as React.CSSProperties}>{word}</span>
                </span>{" "}
              </Fragment>
            ))}
          </h1>

          {intro && <p className="max-w-md text-body text-pretty text-ink-muted sm:text-body-lg">{intro}</p>}

          {facts.length > 0 && (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
              {facts.map((fact, i) => (
                <li key={fact} className="flex items-center gap-4">
                  {i > 0 && <span aria-hidden="true" className="h-1 w-1 bg-accent" />}
                  {fact}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            <MagneticButton href={ctaPrimaryHref} size="lg" arrow cursorLabel="view">
              {ctaPrimary}
            </MagneticButton>
            <MagneticButton href={ctaSecondaryHref} size="lg" variant="secondary" cursorLabel="view">
              {ctaSecondary}
            </MagneticButton>
          </div>
        </div>

        <ArtWall
          items={wall}
          columns={wallColumns(wall)}
          className={cn(
            // Narrow: a row in the flow, bled out to both screen edges.
            "-mx-5 mt-9 sm:-mx-8",
            // Wide: a panel from under the nav to the foot of the hero.
            "lg:absolute lg:bottom-0 lg:left-[52%] lg:right-0 lg:top-[var(--nav-h)] lg:mx-0 lg:mt-0 lg:pr-4",
          )}
        />

        <ProofLine stats={stats} note={proofNote} className="mt-9 w-full lg:mt-10 lg:w-[46%] lg:max-w-xl" />
      </div>
    </section>
  );
}
