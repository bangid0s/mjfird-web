"use client";

import { useEffect, useRef, useState } from "react";
import Lightbox from "@/components/gallery/Lightbox";
import TiltCard from "@/components/home/TiltCard";
import SmartImage from "@/components/media/SmartImage";
import type { GalleryItem } from "@/lib/data/gallery";
import { wallColumns } from "@/lib/home";
import { cn } from "@/lib/cn";

// Slightly different speeds so the three columns never line up for long.
const DURATIONS = ["84s", "102s", "72s"];

/**
 * The hero's wall of commissions. Layout and drift are CSS (see `.art-wall`
 * in `globals.css`); this holds the lightbox state and stops the drift while
 * the wall is off screen.
 *
 * Every tile is rendered twice so each loop is seamless. The second copy, and
 * any tile repeated to pad a short column, is hidden from assistive technology
 * and from the tab order.
 */
export default function ArtWall({ items, className }: { items: GalleryItem[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;
  const columns = wallColumns(items);

  return (
    <div ref={ref} className={cn("art-wall", className)}>
      <div className="art-wall-row">
        {columns.map((column, c) => (
          <div
            key={c}
            className="art-wall-track"
            data-dir={c === 1 ? "down" : "up"}
            style={{ "--wall-duration": DURATIONS[c % DURATIONS.length] } as React.CSSProperties}
          >
            {[false, true].map((clone) =>
              column.map((tile, i) => {
                const hidden = clone || tile.repeat;
                const service = tile.item.services[0]?.title;
                return (
                  <button
                    key={`${clone ? "b" : "a"}-${i}`}
                    type="button"
                    data-clone={clone ? "" : undefined}
                    data-cursor="view"
                    aria-hidden={hidden || undefined}
                    tabIndex={hidden ? -1 : undefined}
                    aria-label={`Enlarge: ${tile.item.title || (service ? `${service} sample` : "artwork")}`}
                    onClick={() => setOpen(tile.index)}
                    // No display utility here: utilities outrank the
                    // component layer, and `.art-wall-tile[data-clone]` has to
                    // be able to hide the copy under reduced motion.
                    className="art-wall-tile"
                  >
                    <TiltCard className="aspect-[5/7] w-full overflow-hidden border border-line bg-bg-raised-2">
                      <SmartImage
                        src={tile.item.imageUrl}
                        alt=""
                        sizes="(min-width: 1024px) 16vw, 42vw"
                        priority={!hidden && tile.index < 3}
                        lazy={hidden || tile.index >= 6}
                      />
                    </TiltCard>
                  </button>
                );
              }),
            )}
          </div>
        ))}
      </div>

      {open !== null && (
        <Lightbox items={items} index={open} onClose={() => setOpen(null)} onIndexChange={setOpen} />
      )}
    </div>
  );
}
