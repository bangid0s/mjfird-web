"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getYouTubeId } from "@/lib/youtube";

export default function HeroMedia({
  type,
  url,
}: {
  type: "image" | "video" | "youtube";
  url: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const youTubeId = type === "youtube" ? getYouTubeId(url) : null;

  if (type === "youtube" && !youTubeId) return null;

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

      {type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}

      {/* Legibility scrim: keeps the wordmark and copy readable over any media */}
      <div className="absolute inset-0 bg-bg/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-bg/50" />
    </div>
  );
}
