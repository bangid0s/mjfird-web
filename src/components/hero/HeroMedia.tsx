"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/cn";

const SLIDE_INTERVAL_MS = 5000;

const ANIMATION_CLASS: Record<string, string> = {
  none: "",
  zoom: "motion-safe:animate-hero-zoom",
  drift: "motion-safe:animate-hero-drift",
  pulse: "motion-safe:animate-hero-pulse",
};

export default function HeroMedia({
  type,
  url,
  urls,
  overlayOpacity = 60,
  animation = "none",
}: {
  type: "image" | "video" | "youtube";
  url: string;
  urls?: string[];
  overlayOpacity?: number;
  animation?: "none" | "zoom" | "drift" | "pulse";
}) {
  const reducedMotion = usePrefersReducedMotion();
  // A YouTube link pasted into the "video" slot still plays as a background embed.
  const youTubeId = type === "youtube" || type === "video" ? getYouTubeId(url) : null;
  const isUploadedVideo = type === "video" && !youTubeId;

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
        // Oversized 16:9 iframe centered to emulate object-fit: cover.
        <iframe
          src={youTubeEmbedUrl(youTubeId, {
            autoplay: !reducedMotion,
            loop: true,
            background: true,
          })}
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
              ANIMATION_CLASS[animation] ?? "",
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
