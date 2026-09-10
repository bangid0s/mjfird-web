"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import MasonryGrid from "@/components/gallery/MasonryGrid";
import Lightbox from "@/components/gallery/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";

const ALL = "All";

export default function GalleryBrowser({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState(ALL);
  // Indexes into the filtered list, so the viewer's prev/next walk what is on
  // screen rather than jumping to images the current filter hides.
  const [open, setOpen] = useState<number | null>(null);

  // Tags in the order they first appear, so the admin's image order decides the
  // chip order too rather than an alphabetical sort nobody asked for.
  const tags = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      for (const tag of item.tags) if (!seen.includes(tag)) seen.push(tag);
    }
    return seen;
  }, [items]);

  const filtered =
    active === ALL ? items : items.filter((item) => item.tags.includes(active));

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {tags.length > 0 && (
        <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
          {[ALL, ...tags].map((tag) => {
            const selected = tag === active;
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setActive(tag);
                  setOpen(null);
                }}
                className={cn(
                  "rounded-xl px-4 py-2 font-mono text-label uppercase tracking-[0.15em] transition-colors duration-[var(--duration-fast)]",
                  selected
                    ? "bg-accent/15 text-accent ring-1 ring-accent/50"
                    : "bg-bg-raised text-ink-muted hover:text-ink",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="border border-line p-5 font-body text-body-sm text-ink-faint lg:p-6">
          Nothing tagged “{active}” yet.
        </p>
      ) : (
        <MasonryGrid items={filtered} onOpen={setOpen} />
      )}

      {open !== null && (
        <Lightbox
          items={filtered}
          index={open}
          onClose={() => setOpen(null)}
          onIndexChange={setOpen}
        />
      )}
    </div>
  );
}
