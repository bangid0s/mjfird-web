import { mediaThumbnail } from "@/lib/media";
import type { GalleryItem } from "@/lib/data/gallery";

// True masonry via CSS columns: tiles keep their image's own aspect ratio and
// the browser balances the columns, which is what gives the Pinterest stagger.
// The trade-off is that reading order runs down each column rather than across
// the rows — fine for a gallery, where the tiles are independent.
export default function MasonryGrid({
  items,
  onOpen,
}: {
  items: GalleryItem[];
  onOpen: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 lg:gap-4">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(i)}
          aria-label={item.title ? `Enlarge: ${item.title}` : "Enlarge image"}
          className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-bg-raised shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] lg:mb-4"
        >
          {/* Pasted addresses have unknown dimensions, so the image sets its
              own height — that is what the masonry column needs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaThumbnail(item.imageUrl)}
            alt={item.title || ""}
            loading={i < 6 ? "eager" : "lazy"}
            decoding="async"
            className="w-full transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
          />

          {(item.title || item.caption) && (
            <span
              className={
                // Sits over the image on hover, and stays put on touch, where
                // there is no hover to reveal it.
                "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 text-left " +
                "bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0)_100%)] " +
                "px-3 pb-3 pt-8 opacity-100 transition-opacity duration-[var(--duration-base)] " +
                "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
              }
            >
              {item.title && (
                <span className="line-clamp-2 font-body text-body-sm font-medium text-white">
                  {item.title}
                </span>
              )}
              {item.caption && (
                <span className="line-clamp-2 font-body text-label text-white/70">
                  {item.caption}
                </span>
              )}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
