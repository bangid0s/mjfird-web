"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/cn";

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
}: {
  type: "image" | "video" | "youtube";
  url: string;
  images?: string[];
  activeIndex?: number;
  onGoTo?: (index: number) => void;
  overlayOpacity?: number;
  animation?: "none" | "zoom" | "drift" | "pulse";
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
  const scrim = Math.min(100, Math.max(0, overlayOpacity)) / 100;

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
        Legibility scrim. This used to be a flat wash across the entire frame,
        which dulled the whole image just to make text readable in one corner.
        It's directional now: solid only where the copy actually sits, and
        fully clear over the rest of the artwork — anchored left on wide
        screens, bottom on narrow ones where the copy runs full width.
        Strength still comes from Site Settings.
      */}
      <div
        className="absolute inset-0 sm:hidden"
        style={{
          opacity: scrim,
          background:
            "linear-gradient(to top, var(--color-bg) 0%, var(--color-bg) 22%, transparent 76%)",
        }}
      />
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          opacity: scrim,
          background:
            "linear-gradient(95deg, var(--color-bg) 0%, var(--color-bg) 20%, transparent 64%)",
        }}
      />
      {/* Short fade into the section below — never more than the bottom eighth. */}
      <div className="absolute inset-x-0 bottom-0 h-[12%] bg-gradient-to-t from-bg to-transparent" />
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
          className="pointer-events-auto absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/50 text-lg text-ink backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-bg/80 sm:left-6"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(current + 1)}
          aria-label="Next slide"
          className="pointer-events-auto absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/50 text-lg text-ink backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-bg/80 sm:right-6"
        >
          ›
        </button>
        <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              className={cn(
                "h-2 rounded-full transition-all duration-[var(--duration-fast)]",
                i === current ? "w-6 bg-accent" : "w-2 bg-ink/40 hover:bg-ink/70",
              )}
            />
          ))}
        </div>
      </div>
    )}
    </>
  );
}
