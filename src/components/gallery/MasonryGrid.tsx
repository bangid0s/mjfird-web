import { isVideoFile, isYouTubeUrl, mediaThumbnail } from "@/lib/media";
import type { GalleryItem } from "@/lib/data/gallery";
import FlowImage from "@/components/media/FlowImage";

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
          className="group relative mb-3 block w-full break-inside-avoid overflow-hidden border border-line bg-bg-raised lg:mb-4"
        >
          {/* Pasted addresses have unknown dimensions, so the image sets its
              own height — that is what the masonry column needs. */}
          {isVideoFile(item.imageUrl) ? (
            <video
              src={item.imageUrl}
              muted
              playsInline
              preload="metadata"
              className="w-full transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
            />
          ) : (
            <FlowImage
              src={mediaThumbnail(item.imageUrl)}
              alt={item.title || ""}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              priority={i < 4}
              className="h-auto w-full transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
            />
          )}

          {(isVideoFile(item.imageUrl) || isYouTubeUrl(item.imageUrl)) && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-accent pl-1 text-accent-ink">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          )}

          {(item.title || item.caption || item.clientName || item.review) && (
            <span
              className={
                // Hover/focus only — at rest nothing is painted over the
                // artwork. On touch there is no hover, but tapping opens the
                // lightbox, which carries the title and caption anyway.
                "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 text-left " +
                "bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0)_100%)] " +
                "px-3 pb-3 pt-8 opacity-0 transition-opacity duration-[var(--duration-base)] " +
                "group-hover:opacity-100 group-focus-visible:opacity-100"
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
              {(item.clientName || item.review) && (
                <span className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/80">
                  {item.clientName && <span>For {item.clientName}</span>}
                  {item.review?.rating ? <span aria-hidden="true">★ {item.review.rating}</span> : null}
                  {item.review?.verified && <span className="text-accent">✓ Verified</span>}
                </span>
              )}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
