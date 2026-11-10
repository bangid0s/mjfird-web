"use client";

import { useCallback, useEffect, useState } from "react";
import HeroMedia from "@/components/hero/HeroMedia";
import HeroMotionFrame from "@/components/hero/HeroMotionFrame";
import KineticWordmark from "@/components/hero/KineticWordmark";
import MagneticButton from "@/components/ui/MagneticButton";
import ProofLine from "@/components/ui/ProofLine";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { HeroSlide } from "@/lib/data/site-settings";
import { cn } from "@/lib/cn";

// Where the primary button points when a slide doesn't name its own link.
const DEFAULT_CTA_HREF = "/work";

/*
  A split sheet rather than a photo with text on top of it.

  The media never sits behind the copy. On wide screens it is a panel occupying
  the right of the frame with the copy on clean ground beside it; below `lg` the
  split turns vertical and the panel becomes a band under the copy. Either way
  no text crosses the artwork, so nothing is painted over it — no tint, no
  gradient — and the image keeps its own colour.

  The copy is one stack, top to bottom: label, headline, intro, buttons, then
  the numbers that back the claim. The headline says what is on offer; with
  none set, the wordmark stands in for it. Nothing is spread to the corners any
  more — that left the offer stranded under a screen of empty ground.

  Corner work: a rotated label up the left gutter and a solid accent square in
  the bottom corner.
*/

export default function Hero({
  mediaType,
  mediaUrl,
  slides,
  animation,
  slideDuration,
  eyebrow,
  intro,
  ctaPrimary,
  ctaSecondary,
  edgeLabel,
  headline,
  stats,
  proofNote,
}: {
  mediaType: "none" | "image" | "video" | "youtube";
  mediaUrl: string;
  slides: HeroSlide[];
  animation: "none" | "zoom" | "drift" | "pulse";
  slideDuration: number;
  eyebrow: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  /** Rotated label up the left gutter, on the widest screens only. */
  edgeLabel?: string;
  /** The offer, as the page's h1. Blank shows the wordmark instead. */
  headline: string;
  stats: { value: number; suffix: string; label: string }[];
  proofNote: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  // First paint stays exactly as it was; only a slide *change* animates the copy.
  const [hasChanged, setHasChanged] = useState(false);

  const images = mediaType === "image" ? slides.map((slide) => slide.url) : [];
  const count = images.length;
  const rotates = count > 1;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
      setHasChanged(true);
    },
    [count],
  );

  useEffect(() => {
    if (!rotates || reducedMotion) return;
    // Keyed on `index` so clicking through also resets the countdown — each
    // slide gets its full time on screen after a manual jump.
    const id = setTimeout(() => goTo(index + 1), Math.max(1, slideDuration) * 1000);
    return () => clearTimeout(id);
  }, [rotates, reducedMotion, slideDuration, index, goTo]);

  // Per-slide copy, falling back to the hero's own text field by field, so a
  // slider whose slides carry no copy reads exactly as it did before.
  const active = mediaType === "image" ? slides[Math.min(index, count - 1)] : undefined;
  const slideEyebrow = active?.eyebrow || eyebrow;
  const slideIntro = active?.intro || intro;
  const slideCtaLabel = active?.ctaLabel || ctaPrimary;
  const slideCtaHref = active?.ctaUrl || DEFAULT_CTA_HREF;

  const copyAnimation = hasChanged ? "motion-safe:animate-rise" : "";
  const hasMedia = mediaType !== "none" && (mediaUrl || count > 0);

  return (
    <section className="relative -mt-[var(--nav-h)] overflow-hidden border-b border-line">
      {/*
        Rotated edge label, in the left gutter. It used to run up the right
        edge, which is where the media panel now is — dark spec type over
        whatever colour the artwork happened to be. The left gutter is always
        clean ground.
      */}
      {edgeLabel && (
        <span
          aria-hidden="true"
          className="spec label-vertical absolute left-4 top-[calc(var(--nav-h)+3rem)] z-[var(--z-content)] hidden xl:block"
        >
          {edgeLabel}
        </span>
      )}

      <div
        className={cn(
          "container-page relative z-[var(--z-content)] flex flex-col justify-center pb-14 pt-[calc(var(--nav-h)+2.5rem)] lg:pb-24 lg:pt-[calc(var(--nav-h)+3.5rem)]",
          // Tall enough to hold the artwork, short enough that the next
          // section's rule shows above the fold on a laptop.
          "lg:min-h-[max(76svh,40rem)]",
        )}
      >
        {/* Beside the media panel the copy keeps to its own half of the sheet. */}
        <div className={cn("flex flex-col items-start gap-7", hasMedia && "lg:w-[48%]")}>
          <p key={`eyebrow-${index}`} className={cn("spec", copyAnimation)}>
            {slideEyebrow}
          </p>

          {/* Outside the keyed copy: the headline shouldn't replay on every slide. */}
          {headline ? <h1 className="display-md max-w-xl">{headline}</h1> : <KineticWordmark />}

          <div key={`copy-${index}`} className={cn("flex flex-col items-start gap-7", copyAnimation)}>
            <p className="max-w-md text-body-lg text-pretty text-ink-muted">{slideIntro}</p>
            <div className="flex flex-wrap gap-3">
              <MagneticButton href={slideCtaHref} size="lg" arrow cursorLabel="view">
                {slideCtaLabel}
              </MagneticButton>
              <MagneticButton href="/contact" size="lg" variant="secondary" cursorLabel="view">
                {ctaSecondary}
              </MagneticButton>
            </div>
          </div>

          <ProofLine stats={stats} note={proofNote} className="mt-3 w-full max-w-xl" />
        </div>
      </div>

      {/*
        Media frame. A band in the flow under the copy on narrow screens, an
        absolutely placed panel on the right from `lg` up.

        Two things it is deliberately not. It is not behind the copy on mobile:
        that needed a bottom-anchored scrim to keep the intro readable, and the
        scrim washed the bottom third of the artwork out. And it does not run
        under the nav, which left the labels unreadable over whatever the image
        happened to be. Both fixes buy the same thing — the image is never
        overlaid, at any width.

        HeroMotionFrame gives the frame its entrance wipe, scroll depth and
        pointer parallax — all as movement of the frame and the media in it,
        never as anything painted on top.
      */}
      {hasMedia && (
        <HeroMotionFrame
          className={cn(
            // Narrow: a band in the flow, sized by height.
            "relative h-[46svh] min-h-[280px] w-full",
            // Wide: a panel pinned to the right of the sheet, sized by its own
            // offsets. Every mobile sizing utility has to be handed back for
            // that to work — `w-full` in particular, because a box with left,
            // right *and* an explicit width drops the right offset and
            // overflows, which crops the image off-centre instead of covering
            // the frame.
            "lg:absolute lg:bottom-0 lg:left-[54%] lg:right-0 lg:top-[var(--nav-h)] lg:h-auto lg:min-h-0 lg:w-auto",
            "lg:border-l lg:border-line",
          )}
        >
          <HeroMedia
            type={mediaType}
            url={mediaUrl}
            images={images}
            activeIndex={index}
            onGoTo={rotates ? goTo : undefined}
            animation={animation}
            scrim="none"
          />
        </HeroMotionFrame>
      )}

      {/* Solid accent square, hard into the bottom-right corner. */}
      <a
        href="#work"
        aria-label="Skip to the work"
        data-cursor="view"
        className="absolute bottom-0 right-0 z-[var(--z-content)] grid h-16 w-16 place-items-center bg-accent text-accent-ink transition-[filter] duration-[var(--duration-fast)] hover:brightness-110 sm:h-20 sm:w-20"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M12 4v16M6 14l6 6 6-6" />
        </svg>
      </a>
    </section>
  );
}
