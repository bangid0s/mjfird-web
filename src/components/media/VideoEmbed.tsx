"use client";

import { useState } from "react";
import { getYouTubeId, youTubeEmbedUrl, youTubeThumbnail } from "@/lib/youtube";

function isVideoFile(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

export default function VideoEmbed({ url, title }: { url: string; title?: string }) {
  const [playing, setPlaying] = useState(false);
  const youTubeId = getYouTubeId(url);

  if (isVideoFile(url)) {
    return (
      <video src={url} controls playsInline preload="metadata" className="h-full w-full object-cover" />
    );
  }

  if (!youTubeId) {
    // Non-YouTube embed URL (e.g. a Vimeo player link) — trust it as-is.
    return (
      <iframe
        src={url}
        title={title || "Video"}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
    );
  }

  if (!playing) {
    // Click-to-play: a thumbnail instead of a live iframe keeps the page fast
    // no matter how many videos are on it.
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        data-cursor="play"
        aria-label={title ? `Play: ${title}` : "Play video"}
        className="group relative block h-full w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={youTubeThumbnail(youTubeId)} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-0 bg-bg/40 transition-colors duration-[var(--duration-base)] group-hover:bg-bg/15" />
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent pl-1 text-accent-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:scale-110">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <iframe
      src={youTubeEmbedUrl(youTubeId, { autoplay: true })}
      title={title || "Video"}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      className="h-full w-full border-0"
    />
  );
}
