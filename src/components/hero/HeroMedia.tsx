"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/cn";

// Copy runs full width, so the scrim rises from the bottom edge.
const BOTTOM_SCRIM =
  "linear-gradient(to top, var(--color-bg) 0%, var(--color-bg) 22%, transparent 76%)";
// Copy sits in the left column, so the scrim clears well before mid-frame.
const LEFT_SCRIM =
  "linear-gradient(95deg, var(--color-bg) 0%, var(--color-bg) 20%, transparent 64%)";

const ANIMATION_CLASS: Record<string, string> = {
  none: "",
  zoom: "motion-safe:animate-hero-zoom",
  drift: "motion-safe:animate-hero-drift",
  pulse: "motion-safe:animate-hero-pulse",
};

// The slideshow is driven from outside (see Hero.tsx) so the hero copy can change
// with the image. Callers with a single background — /links — just leave
// activeIndex and onGoTo off.
export default function HeroMedia({
  type,
  url,
  images,
  activeIndex = 0,
  onGoTo,
  overlayOpacity = 60,
  animation = "none",
  scrim = "overlay",
}: {
  type: "image" | "video" | "youtube";
  url: string;
  images?: string[];
  activeIndex?: number;
  onGoTo?: (index: number) => void;
  overlayOpacity?: number;
  animation?: "none" | "zoom" | "drift" | "pulse";
  /**
   * Whether anything at all is painted over the media.
   *
   * "overlay" — copy sits on top of the media (/links), so a directional scrim
   * has to carry it: bottom-anchored on narrow screens, left-anchored on wide.
   * "none" — the caller gives the media a frame of its own with no text over
   * it at any width (the homepage hero), so the artwork is left untouched.
   */
  scrim?: "overlay" | "none";
}) {
  const reducedMotion = usePrefersReducedMotion();
  // A YouTube link pasted into the "video" slot still plays as a background embed.
  const youTubeId = type === "youtube" || type === "video" ? getYouTubeId(url) : null;
  const isUploadedVideo = type === "video" && !youTubeId;

  // Image mode: use the slideshow list when present, else the single URL.
  const slides = type === "image" ? (images?.length ? images : url ? [url] : []) : [];
  const hasSlides = slides.length > 1 && Boolean(onGoTo);
  const current = Math.min(Math.max(activeIndex, 0), Math.max(slides.length - 1, 0));

  if (type === "youtube" && !youTubeId) return null;
  if (type === "image" && slides.length === 0) return null;

  const goTo = (index: number) => onGoTo?.((index + slides.length) % slides.length);
  const scrimOpacity = Math.min(100, Math.max(0, overlayOpacity)) / 100;

  return (
    <>
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {isUploadedVideo && (
        // Uploaded file: no controls attribute, so it's a clean autoplay wall.
        // Without autoplay (reduced motion) it shows its first frame as a fallback.
        <video
          src={url}
          autoPlay={!reducedMotion}
          loop
          muted
          playsInline
          controls={false}
          preload="metadata"
          className="pointer-events-none h-full w-full object-cover"
        />
      )}

      {youTubeId && (
        // Oversized 16:9 iframe, centered and scaled up ~1.4× so YouTube's
        // title bar (top) and any hover chrome (edges) are cropped off-screen
        // by the container's overflow-hidden — a truly clean video wall.
        <iframe
          src={youTubeEmbedUrl(youTubeId, {
            autoplay: !reducedMotion,
            loop: true,
            background: true,
          })}
          title=""
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          className="pointer-events-none absolute left-1/2 top-1/2 border-0"
          style={{
            width: "max(100%, 177.78vh)",
            height: "max(100%, 56.25vw)",
            aspectRatio: "16 / 9",
            transform: "translate(-50%, -50%) scale(1.4)",
          }}
        />
      )}

      {type === "image" &&
        slides.map((imageUrl, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${imageUrl}-${i}`}
            src={imageUrl}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-[var(--ease-freeze)]",
              ANIMATION_CLASS[animation] ?? "",
              i === current ? "opacity-100" : "opacity-0",
            )}
          />
        ))}

      {/*
        Legibility scrim, and only where copy actually sits on the media.
        Strength comes from Site Settings.

        Callers that give the media a frame of its own pass scrim="none" and get
        nothing over the artwork at any width — no tint, no bottom fade into the
        section below. The frame just ends on the section's hairline, which
        suits the hard edges everywhere else.
      */}
      {scrim === "overlay" && (
        <>
          <div
            className="absolute inset-0 sm:hidden"
            style={{ opacity: scrimOpacity, background: BOTTOM_SCRIM }}
          />
          <div
            className="absolute inset-0 hidden sm:block"
            style={{ opacity: scrimOpacity, background: LEFT_SCRIM }}
          />
        </>
      )}
    </div>

    {/* Slider navigation — only when there's more than one image. The wrapper
        stays pointer-events-none so it never blocks the hero's own buttons;
        only the controls themselves are clickable. */}
    {hasSlides && (
      <div className="pointer-events-none absolute inset-0 z-10">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          aria-label="Previous slide"
          className="pointer-events-auto absolute left-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-bg/70 text-lg text-ink backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-bg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(current + 1)}
          aria-label="Next slide"
          className="pointer-events-auto absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-bg/70 text-lg text-ink backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-bg"
        >
          ›
        </button>
        <div className="pointer-events-auto absolute bottom-5 left-5 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              className={cn(
                "h-1.5 transition-all duration-[var(--duration-fast)]",
                i === current ? "w-8 bg-accent" : "w-4 bg-ink/35 hover:bg-ink/60",
              )}
            />
          ))}
        </div>
      </div>
    )}
    </>
  );
}
