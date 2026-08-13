"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { mediaThumbnail } from "@/lib/media";
import type { GalleryItem } from "@/lib/data/gallery";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

/**
 * Full-screen viewer for a gallery image. Escape closes, arrows step, the
 * backdrop is a click target, and the page behind is locked from scrolling
 * while it is open — the same contract the case-study gallery uses.
 */
export default function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const next = useCallback(
    () => onIndexChange((index + 1) % items.length),
    [index, items.length, onIndexChange],
  );
  const prev = useCallback(
    () => onIndexChange((index - 1 + items.length) % items.length),
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, next, prev]);

  // Move focus into the dialog so the keyboard bindings have somewhere to land
  // and a screen reader announces the change.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const item = items[index];
  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title || "Image viewer"}
      onClick={onClose}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-bg/95 p-4 backdrop-blur-sm sm:p-10"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full font-mono text-lg text-ink-muted transition-colors hover:text-accent"
      >
        ✕
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full font-mono text-2xl text-ink-muted transition-colors hover:text-accent sm:left-6"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next image"
            className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full font-mono text-2xl text-ink-muted transition-colors hover:text-accent sm:right-6"
          >
            ›
          </button>
        </>
      )}

      <figure
        className="flex max-h-full w-full max-w-5xl flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaThumbnail(item.imageUrl)}
          alt={item.title || ""}
          className="max-h-[78svh] w-auto rounded-2xl object-contain"
        />

        {(item.title || item.caption || item.linkUrl || item.tags.length > 0) && (
          <figcaption className="flex flex-col items-center gap-2 text-center">
            {item.title && (
              <span className="font-body text-body font-medium text-ink">{item.title}</span>
            )}
            {item.caption && (
              <span className="font-body text-body-sm text-ink-muted">{item.caption}</span>
            )}
            {item.tags.length > 0 && (
              <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-faint">
                {item.tags.join(" · ")}
              </span>
            )}
            {/* The tile's own click now opens this viewer, so an item's link
                lives here instead of on the tile. */}
            {item.linkUrl &&
              (isExternal(item.linkUrl) ? (
                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 rounded-full bg-accent px-6 py-2.5 font-body text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
                >
                  Visit link ↗
                </a>
              ) : (
                <Link
                  href={item.linkUrl}
                  className="mt-1 rounded-full bg-accent px-6 py-2.5 font-body text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
                >
                  Visit link →
                </Link>
              ))}
          </figcaption>
        )}
      </figure>

      {items.length > 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-label text-ink-faint">
          {index + 1} / {items.length}
        </span>
      )}
    </div>
  );
}
