"use client";

import { useState } from "react";
import Lightbox from "@/components/gallery/Lightbox";
import TiltCard from "@/components/home/TiltCard";
import SmartImage from "@/components/media/SmartImage";
import type { GalleryItem } from "@/lib/data/gallery";

/**
 * A service's samples: a four-across grid on wide screens, a strip that
 * scrolls sideways (and bleeds to the screen edges) on narrow ones. Each
 * opens the shared viewer, without its "commission this" link — the row it
 * sits in already has the order button.
 */
export default function SampleStrip({ items, label }: { items: GalleryItem[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <>
      <ul
        aria-label={`${label} samples`}
        className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:p-0"
      >
        {items.map((item, i) => (
          <li key={item.id} className="w-[38vw] max-w-[13rem] shrink-0 snap-start lg:w-auto lg:max-w-none">
            <button
              type="button"
              data-cursor="view"
              aria-label={`Enlarge: ${item.title || `${label} sample ${i + 1}`}`}
              onClick={() => setOpen(i)}
              className="block w-full"
            >
              <TiltCard className="aspect-[5/7] w-full overflow-hidden border border-line bg-bg-raised-2">
                <SmartImage src={item.imageUrl} alt="" sizes="(min-width: 1024px) 14vw, 38vw" lazy />
              </TiltCard>
            </button>
          </li>
        ))}
      </ul>

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
