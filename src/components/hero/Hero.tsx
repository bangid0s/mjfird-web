"use client";

import { useCallback, useEffect, useState } from "react";
import HeroMedia from "@/components/hero/HeroMedia";
import KineticWordmark from "@/components/hero/KineticWordmark";
import MagneticButton from "@/components/ui/MagneticButton";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { HeroSlide } from "@/lib/data/site-settings";
import { cn } from "@/lib/cn";

// Where the primary button points when a slide doesn't name its own link.
const DEFAULT_CTA_HREF = "/work";

/*
  A split sheet rather than a photo with text on top of it.

  On wide screens the media is a panel occupying the right of the frame and the
  copy sits on clean ground beside it, so almost none of the artwork has
  anything over it. Below `lg` the panel goes full-bleed behind the copy, where
  HeroMedia's directional scrim earns its keep.

  Everything else is corner work: a spec label above the wordmark, a rotated
  label up the right edge, and a solid accent square in the bottom corner.
*/

export default function Hero({
  mediaType,
  mediaUrl,
  slides,
  overlayOpacity,
  animation,
  slideDuration,
  eyebrow,
  intro,
  ctaPrimary,
  ctaSecondary,
  edgeLabel,
}: {
  mediaType: "none" | "image" | "video" | "youtube";
  mediaUrl: string;
  slides: HeroSlide[];
  overlayOpacity: number;
  animation: "none" | "zoom" | "drift" | "pulse";
  slideDuration: number;
  eyebrow: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  /** Rotated label up the right edge. */
  edgeLabel?: string;
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
      {/* Media panel: right of the frame on wide screens, full-bleed below. */}
      <div className={cn("absolute inset-0", hasMedia && "lg:left-[54%] lg:border-l lg:border-line")}>
        {hasMedia && (
          <HeroMedia
            type={mediaType}
            url={mediaUrl}
            images={images}
            activeIndex={index}
            onGoTo={rotates ? goTo : undefined}
            overlayOpacity={overlayOpacity}
            animation={animation}
          />
        )}
      </div>

      {/* Rotated edge label. */}
      {edgeLabel && (
        <span
          aria-hidden="true"
          className="spec label-vertical absolute right-4 top-[calc(var(--nav-h)+3rem)] z-[var(--z-content)] hidden xl:block"
        >
          {edgeLabel}
        </span>
      )}

      <div className="container-page relative z-[var(--z-content)] flex min-h-svh flex-col justify-between pb-24 pt-[calc(var(--nav-h)+3.5rem)]">
        <div className="flex flex-col gap-8">
          <p key={`eyebrow-${index}`} className={cn("spec", copyAnimation)}>
            {slideEyebrow}
          </p>

          {/* Outside the keyed copy: the wordmark keeps its own entrance and
              shouldn't replay on every slide. */}
          <KineticWordmark />
        </div>

        <div
          key={`copy-${index}`}
          className={cn("flex max-w-md flex-col items-start gap-8", copyAnimation)}
        >
          <p className="text-body-lg text-pretty text-ink-muted">{slideIntro}</p>
          <div className="flex flex-wrap gap-3">
            <MagneticButton href={slideCtaHref} size="lg" arrow cursorLabel="view">
              {slideCtaLabel}
            </MagneticButton>
            <MagneticButton href="/contact" size="lg" variant="secondary" cursorLabel="view">
              {ctaSecondary}
            </MagneticButton>
          </div>
        </div>
      </div>

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
