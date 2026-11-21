"use client";

import { useState } from "react";
import MasonryGrid from "@/components/gallery/MasonryGrid";
import Lightbox from "@/components/gallery/Lightbox";
import FlowImage from "@/components/media/FlowImage";
import type { GalleryItem } from "@/lib/data/gallery";
import { withCoverFirst } from "@/lib/gallery-view";

/**
 * A service's showcase: its cover first, full width and uncropped, then the
 * gallery images filed under it and any extra samples typed on the service.
 * Same tiles and viewer as /gallery, so the client name and review travel with
 * each image; the cover opens in the same viewer, as its first frame.
 */
export default function ServiceSamples({
  items,
  cover,
}: {
  items: GalleryItem[];
  /** The service's cover image. Shown above the samples, never twice. */
  cover?: { url: string; alt: string };
}) {
  const [open, setOpen] = useState<number | null>(null);
  const { coverItem, rest } = withCoverFirst(items, cover);
  const viewer = coverItem ? [coverItem, ...rest] : rest;
  const offset = coverItem ? 1 : 0;
  if (viewer.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {coverItem && (
        <button
          type="button"
          onClick={() => setOpen(0)}
          aria-label={`Enlarge cover: ${coverItem.title}`}
          data-cursor="view"
          className="group block w-full overflow-hidden border border-line bg-bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <FlowImage
            src={coverItem.imageUrl}
            alt={coverItem.title}
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="mx-auto block h-auto max-h-[80svh] w-auto max-w-full object-contain transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.01]"
          />
        </button>
      )}

      {rest.length > 0 && <MasonryGrid items={rest} onOpen={(i) => setOpen(i + offset)} serviceFallback={false} />}

      {open !== null && (
        <Lightbox items={viewer} index={open} onClose={() => setOpen(null)} onIndexChange={setOpen} showServices={false} />
      )}
    </div>
  );
}
