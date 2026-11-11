"use client";

import { useState } from "react";
import MasonryGrid from "@/components/gallery/MasonryGrid";
import Lightbox from "@/components/gallery/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";

/**
 * A service's sample grid: the gallery images filed under it, then any extra
 * samples typed on the service itself. Same tiles and viewer as /gallery, so
 * the client name and review travel with each image.
 */
export default function ServiceSamples({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <>
      <MasonryGrid items={items} onOpen={setOpen} />
      {open !== null && (
        <Lightbox
          items={items}
          index={open}
          onClose={() => setOpen(null)}
          onIndexChange={setOpen}
          showServices={false}
        />
      )}
    </>
  );
}
