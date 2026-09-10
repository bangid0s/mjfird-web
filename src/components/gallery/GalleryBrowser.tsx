"use client";

import { useMemo, useState } from "react";
import FilterChips from "@/components/ui/FilterChips";
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
    <div className="flex flex-col gap-10">
      {/* The same chip row as /work — this page used to roll its own. */}
      {tags.length > 0 && (
        <FilterChips
          options={tags}
          onChange={(tag) => {
            setActive(tag);
            setOpen(null);
          }}
        />
      )}

      {filtered.length === 0 ? (
        <p className="border border-dashed border-line px-6 py-14 text-center text-body-sm text-ink-muted">
          Nothing tagged &ldquo;{active}&rdquo; yet.
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
