"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getYouTubeId } from "@/lib/youtube";
import { cn } from "@/lib/cn";

const SLIDE_INTERVAL_MS = 5000;

export default function HeroMedia({
  type,
  url,
  urls,
  overlayOpacity = 60,
}: {
  type: "image" | "video" | "youtube";
  url: string;
  urls?: string[];
  overlayOpacity?: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const youTubeId = type === "youtube" ? getYouTubeId(url) : null;

  // Image mode: use the slideshow list when present, else the single URL.
  const images = type === "image" ? (urls?.length ? urls : url ? [url] : []) : [];
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (type !== "image" || images.length < 2 || reducedMotion) return;
    const id = setInterval(() => {
      setSlide((current) => (current + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [type, images.length, reducedMotion]);

  if (type === "youtube" && !youTubeId) return null;
  if (type === "image" && images.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {type === "video" && (
        // Without autoplay (reduced motion) the video shows its first frame,
        // which doubles as the static fallback.
        <video
          src={url}
          autoPlay={!reducedMotion}
          loop
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      )}

      {type === "youtube" && youTubeId && (
        // Oversized 16:9 iframe centered to emulate object-fit: cover.
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youTubeId}?autoplay=${reducedMotion ? 0 : 1}&mute=1&loop=1&playlist=${youTubeId}&controls=0&rel=0&playsinline=1&disablekb=1&modestbranding=1&iv_load_policy=3`}
          title=""
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0"
          style={{
            width: "max(100%, 177.78vh)",
            height: "max(100%, 56.25vw)",
            aspectRatio: "16 / 9",
          }}
        />
      )}

      {type === "image" &&
        images.map((imageUrl, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${imageUrl}-${i}`}
            src={imageUrl}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-[var(--ease-freeze)]",
              i === slide ? "opacity-100" : "opacity-0",
            )}
          />
        ))}

      {/* Legibility scrim — strength set from Site Settings (hero overlay %) */}
      <div
        className="absolute inset-0 bg-bg"
        style={{ opacity: Math.min(100, Math.max(0, overlayOpacity)) / 100 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
    </div>
  );
}
