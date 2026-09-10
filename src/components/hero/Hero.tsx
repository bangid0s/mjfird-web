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
    <section className="relative -mt-[var(--nav-h)] overflow-hidden">
      {hasMedia ? (
        <HeroMedia
          type={mediaType}
          url={mediaUrl}
          images={images}
          activeIndex={index}
          onGoTo={rotates ? goTo : undefined}
          overlayOpacity={overlayOpacity}
          animation={animation}
        />
      ) : (
        // No hero media configured: a soft accent wash rather than a flat wall.
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-[10%] top-[-20%] h-[46rem] w-[46rem] rounded-full bg-accent opacity-[0.13] blur-[120px]" />
          <div className="absolute -right-[15%] bottom-[-25%] h-[38rem] w-[38rem] rounded-full bg-accent-echo opacity-[0.09] blur-[120px]" />
        </div>
      )}

      <div className="container-page relative flex min-h-[88svh] flex-col justify-center gap-9 pb-20 pt-[calc(var(--nav-h)+3rem)]">
        <div className="flex flex-col gap-7">
          <p
            key={`eyebrow-${index}`}
            className={cn(
              "inline-flex w-fit items-center gap-2.5 rounded-full border border-line bg-bg/60 px-4 py-2 text-label font-medium tracking-[0.06em] text-ink-muted uppercase backdrop-blur-sm",
              copyAnimation,
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {slideEyebrow}
          </p>

          {/* Outside the keyed copy: the wordmark keeps its own entrance and
              shouldn't replay on every slide. */}
          <KineticWordmark />
        </div>

        <div
          key={`copy-${index}`}
          className={cn(
            "flex flex-col items-start gap-8 border-t border-line/70 pt-8 sm:flex-row sm:items-end sm:justify-between",
            copyAnimation,
          )}
        >
          <p className="max-w-lg text-body-lg text-pretty text-ink-muted">{slideIntro}</p>
          <div className="flex flex-wrap gap-3">
            <MagneticButton href={slideCtaHref} size="lg" arrow cursorLabel="view">
              {slideCtaLabel}
            </MagneticButton>
            <MagneticButton
              href="/contact"
              size="lg"
              variant="secondary"
              cursorLabel="view"
            >
              {ctaSecondary}
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}
