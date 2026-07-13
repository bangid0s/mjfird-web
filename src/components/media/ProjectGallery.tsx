"use client";

import { useCallback, useEffect, useState } from "react";
import { isYouTubeUrl, isVideoFile, mediaThumbnail } from "@/lib/media";
import { getYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";

type GalleryImage = { url: string; alt?: string };

function isPlayable(url: string) {
  return isYouTubeUrl(url) || isVideoFile(url);
}

// Masonry gallery (CSS columns) that shows every image at its natural aspect
// ratio — nothing cropped — and opens a full-screen lightbox on click, with
// keyboard + prev/next navigation. Videos/YouTube open as embedded players.
export default function ProjectGallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(
    () => setOpen((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );
  const prev = useCallback(
    () => setOpen((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, next, prev]);

  if (images.length === 0) return null;

  const active = open === null ? null : images[open];

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {images.map((image, i) => {
          const playable = isPlayable(image.url);
          return (
            <button
              key={`${image.url}-${i}`}
              type="button"
              onClick={() => setOpen(i)}
              data-cursor={playable ? "play" : "view"}
              className="group relative block w-full overflow-hidden break-inside-avoid border border-line bg-bg-raised"
              aria-label={playable ? "Play media" : "View full image"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaThumbnail(image.url)}
                alt={image.alt ?? ""}
                loading="lazy"
                className="w-full transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute inset-0 bg-bg/0 transition-colors duration-[var(--duration-base)] group-hover:bg-bg/20" />
              {playable && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent pl-1 text-accent-ink">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-bg/95 p-4 backdrop-blur-sm sm:p-10"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center font-mono text-lg text-ink-muted transition-colors hover:text-accent"
          >
            ✕
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center font-mono text-2xl text-ink-muted transition-colors hover:text-accent sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center font-mono text-2xl text-ink-muted transition-colors hover:text-accent sm:right-6"
              >
                ›
              </button>
            </>
          )}

          <div className="max-h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {isYouTubeUrl(active.url) ? (
              <div className="relative aspect-video w-full">
                <iframe
                  src={youTubeEmbedUrl(getYouTubeId(active.url)!, { autoplay: true })}
                  title={active.alt || "Video"}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            ) : isVideoFile(active.url) ? (
              <video src={active.url} controls autoPlay playsInline className="mx-auto max-h-[85svh] w-auto" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt={active.alt ?? ""}
                className="mx-auto max-h-[85svh] w-auto object-contain"
              />
            )}
            {active.alt && (
              <p className="mt-3 text-center font-mono text-label uppercase tracking-[0.15em] text-ink-muted">
                {active.alt}
              </p>
            )}
          </div>

          {images.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-label text-ink-faint">
              {open! + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
