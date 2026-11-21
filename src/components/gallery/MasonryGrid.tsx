import { isVideoFile, isYouTubeUrl, mediaThumbnail } from "@/lib/media";
import type { GalleryItem } from "@/lib/data/gallery";
import { cardLabel, isClientWork } from "@/lib/gallery-view";
import FlowImage from "@/components/media/FlowImage";

// True masonry via CSS columns: tiles keep their image's own aspect ratio and
// the browser balances the columns, which is what gives the Pinterest stagger.
// The trade-off is that reading order runs down each column rather than across
// the rows — fine for a gallery, where the tiles are independent.
//
// Each card is the artwork with its name underneath, nothing painted over the
// art except a small "Commission" badge on real client work. Three wide
// columns on desktop so each piece reads at a size worth looking at.
const TILE_CLASS =
  "group mb-5 block w-full break-inside-avoid text-left focus-visible:outline-none sm:mb-7 lg:mb-8";

function Tile({
  href,
  onOpen,
  label,
  children,
}: {
  href?: string;
  onOpen: () => void;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <button type="button" onClick={onOpen} aria-label={label} data-cursor="view" className={TILE_CLASS}>
        {children}
      </button>
    );
  }
  return (
    <a
      href={href}
      onClick={(e) => {
        // Let modified clicks (new tab, new window) do what links do.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onOpen();
      }}
      aria-label={label}
      data-cursor="view"
      className={TILE_CLASS}
    >
      {children}
    </a>
  );
}

export default function MasonryGrid({
  items,
  onOpen,
  serviceFallback = true,
}: {
  items: GalleryItem[];
  onOpen: (index: number) => void;
  /** Name untitled cards after their service. Off on a service's own page. */
  serviceFallback?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="columns-2 gap-3 sm:gap-5 lg:columns-3 lg:gap-6">
      {items.map((item, i) => {
        const label = cardLabel(item, serviceFallback);
        const video = isVideoFile(item.imageUrl);
        return (
          // A real link to the piece's own page when it has one, so crawlers
          // and new-tab clicks reach /gallery/<slug>. A plain click still
          // opens the viewer in place.
          <Tile
            key={item.id}
            href={item.slug ? `/gallery/${item.slug}` : undefined}
            onOpen={() => onOpen(i)}
            label={label ? `Open: ${label}` : "Open image"}
          >
            <span className="relative block overflow-hidden border border-line bg-bg-raised transition-[border-color,transform] duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:-translate-y-0.5 group-hover:border-ink group-focus-visible:border-accent group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent">
              {/* Pasted addresses have unknown dimensions, so the image sets its
                  own height — that is what the masonry column needs. */}
              {video ? (
                <video
                  src={item.imageUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="block w-full transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.02]"
                />
              ) : (
                <FlowImage
                  src={mediaThumbnail(item.imageUrl)}
                  alt={item.title || label || ""}
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  priority={i < 3}
                  className="block h-auto w-full transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.02]"
                />
              )}

              {isClientWork(item) && (
                <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1.5 bg-black/65 px-2 py-1 font-body text-[11px] font-medium text-white backdrop-blur-sm sm:left-3 sm:top-3 sm:px-2.5 sm:text-[12px]">
                  <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center bg-accent text-[9px] leading-none text-accent-ink">
                    ✓
                  </span>
                  Commission
                </span>
              )}

              {(video || isYouTubeUrl(item.imageUrl)) && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-accent pl-1 text-accent-ink">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </span>

            {label && (
              <span className="mt-2.5 block truncate font-body text-body-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] group-hover:text-accent-strong sm:text-body">
                {label}
              </span>
            )}
          </Tile>
        );
      })}
    </div>
  );
}
