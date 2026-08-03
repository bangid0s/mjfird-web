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

  return (
    <section className="relative">
      {mediaType !== "none" && (mediaUrl || count > 0) && (
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

      <div className="relative mx-auto flex min-h-[calc(100svh-5rem)] max-w-6xl flex-col justify-center gap-8 px-6 py-20 sm:px-10">
        <p
          key={`eyebrow-${index}`}
          className={cn(
            "font-mono text-label uppercase tracking-[0.3em] text-ink-muted",
            copyAnimation,
          )}
        >
          {slideEyebrow}
        </p>

        {/* Outside the keyed copy: the wordmark keeps its own entrance and
            shouldn't replay on every slide. */}
        <KineticWordmark />

        <div
          key={`copy-${index}`}
          className={cn(
            "flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between",
            copyAnimation,
          )}
        >
          <p className="max-w-md font-body text-body-lg text-ink-muted">{slideIntro}</p>
          <div className="flex gap-4">
            <MagneticButton href={slideCtaHref} cursorLabel="view">
              {slideCtaLabel}
            </MagneticButton>
            <MagneticButton href="/contact" variant="secondary" cursorLabel="view">
              {ctaSecondary}
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}
