"use client";

import { useMemo, useState } from "react";
import FilterChips from "@/components/ui/FilterChips";
import MasonryGrid from "@/components/gallery/MasonryGrid";
import Lightbox from "@/components/gallery/Lightbox";
import type { GalleryItem } from "@/lib/data/gallery";

const ALL = "All";

type Filter = { key: string; label: string; matches: (item: GalleryItem) => boolean };

/**
 * The chips filter by commission: one per service the images are samples of,
 * in the order they first appear. Until any image is linked to a service the
 * old tag chips stand in, so the page never loses its filter.
 */
function buildFilters(items: GalleryItem[]): { filters: Filter[]; byService: boolean } {
  const services = new Map<string, string>();
  for (const item of items) for (const s of item.services) if (!services.has(s.slug)) services.set(s.slug, s.title);
  if (services.size > 0) {
    return {
      byService: true,
      filters: [...services].map(([slug, title]) => ({
        key: slug,
        label: title,
        matches: (item) => item.services.some((s) => s.slug === slug),
      })),
    };
  }
  const tags: string[] = [];
  for (const item of items) for (const tag of item.tags) if (!tags.includes(tag)) tags.push(tag);
  return {
    byService: false,
    filters: tags.map((tag) => ({ key: tag, label: tag, matches: (item) => item.tags.includes(tag) })),
  };
}

export default function GalleryBrowser({
  items,
  initialService,
}: {
  items: GalleryItem[];
  /** Service slug from `/gallery?service=…` — a service page's "See works" link. */
  initialService?: string;
}) {
  const { filters, byService } = useMemo(() => buildFilters(items), [items]);
  const startFilter = byService ? filters.find((f) => f.key === initialService) : undefined;

  const [active, setActive] = useState<Filter | undefined>(startFilter);
  // Indexes into the filtered list, so the viewer's prev/next walk what is on
  // screen rather than jumping to images the current filter hides.
  const [open, setOpen] = useState<number | null>(null);

  const filtered = active ? items.filter(active.matches) : items;

  const choose = (label: string) => {
    const next = filters.find((f) => f.label === label);
    setActive(next);
    setOpen(null);
    // Keep the address shareable ("here's my character work") without a
    // navigation: the list is already on the page.
    if (byService) {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("service", next.key);
      else url.searchParams.delete("service");
      window.history.replaceState(null, "", url);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {filters.length > 0 && (
        <FilterChips
          options={filters.map((f) => f.label)}
          initial={startFilter?.label ?? ALL}
          label={byService ? "Filter by commission" : "Filter by category"}
          onChange={choose}
        />
      )}

      {filtered.length === 0 ? (
        <p className="border border-dashed border-line px-6 py-14 text-center text-body-sm text-ink-muted">
          Nothing under &ldquo;{active?.label}&rdquo; yet.
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
