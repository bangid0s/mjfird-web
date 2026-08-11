import Link from "next/link";
import SmartImage from "@/components/media/SmartImage";
import { cn } from "@/lib/cn";
import type { LinkItem } from "@/lib/data/links";
import type { LinkTileSize } from "@/lib/supabase/types";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

// The label sits on whatever photo was pasted in, so its contrast comes from
// this scrim rather than from the theme: near-solid under the text, clearing
// by the top so most of the image still shows.
const SCRIM =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.62)_38%,rgba(0,0,0,0.1)_78%,rgba(0,0,0,0)_100%)]";

// The grid runs 2 columns on phones, 3 from tablet, 4 on desktop, and the row
// height grows with it so a tile keeps roughly the same 1.2:1 shape at every
// width. Spans stay put across breakpoints — a wide tile is always twice a
// small one, so the hierarchy the admin set survives the reflow. `sizes` tracks
// the rendered tile width so a 1x1 never pulls a full-width file.
const GRID =
  "grid auto-rows-[9rem] grid-flow-row-dense grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:grid-cols-3 lg:auto-rows-[12rem] lg:grid-cols-4 lg:gap-4";

const SMALL_SIZES = "(min-width: 1024px) 15rem, (min-width: 640px) 13rem, 45vw";
const BIG_SIZES = "(min-width: 1024px) 30rem, (min-width: 640px) 27rem, 92vw";

const TILES: Record<LinkTileSize, { span: string; sizes: string }> = {
  small: { span: "col-span-1 row-span-1", sizes: SMALL_SIZES },
  wide: { span: "col-span-2 row-span-1", sizes: BIG_SIZES },
  tall: { span: "col-span-1 row-span-2", sizes: SMALL_SIZES },
  large: { span: "col-span-2 row-span-2", sizes: BIG_SIZES },
};

function Tile({ link }: { link: LinkItem }) {
  const hasImage = Boolean(link.imageUrl);
  const tile = TILES[link.size];

  const inner = (
    <>
      {hasImage && (
        <>
          <SmartImage
            src={link.imageUrl}
            sizes={tile.sizes}
            className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-105"
          />
          <span aria-hidden="true" className={`absolute inset-0 ${SCRIM}`} />
        </>
      )}

      {link.emoji && (
        <span
          aria-hidden="true"
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-lg text-base leading-none",
            hasImage ? "bg-black/40 backdrop-blur-sm" : "bg-accent-ink/10",
          )}
        >
          {link.emoji}
        </span>
      )}

      <span className="relative mt-auto flex items-end justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          {/* The section rides on the tile now that the grid is one piece —
              it's the grouping the divider headings used to carry. */}
          {link.section && (
            <span
              className={cn(
                "mb-1 line-clamp-1 font-mono text-[10px] uppercase tracking-[0.2em]",
                hasImage ? "text-white/55" : "text-accent-ink/55",
              )}
            >
              {link.section}
            </span>
          )}
          <span className="line-clamp-2 font-body text-body-sm font-medium leading-snug">
            {link.label}
          </span>
          {link.description && (
            <span
              className={cn(
                "mt-0.5 line-clamp-1 font-body text-label",
                hasImage ? "text-white/70" : "text-accent-ink/70",
              )}
            >
              {link.description}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
        >
          {isExternal(link.url) ? "↗" : "→"}
        </span>
      </span>
    </>
  );

  const classes = cn(
    "group relative flex flex-col overflow-hidden rounded-2xl p-3 sm:p-4",
    tile.span,
    // Photo tiles keep a black plate under the image in both themes, so a URL
    // that fails to load still reads as a dark tile with white type on it.
    hasImage
      ? "bg-black text-white"
      : "bg-accent text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85",
    link.highlight && "ring-2 ring-accent/60 ring-offset-2 ring-offset-bg-raised",
  );

  return isExternal(link.url) ? (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={classes}>
      {inner}
    </a>
  ) : (
    <Link href={link.url} className={classes}>
      {inner}
    </Link>
  );
}

export default function LinkBento({ items }: { items: LinkItem[] }) {
  if (items.length === 0) return null;

  // One grid for every link rather than one per section: dense flow can then
  // pull any later tile into a hole a tall or wide one left behind, so the
  // whole block packs solid instead of fraying at each section boundary.
  return (
    <div className={GRID}>
      {items.map((link, i) => (
        <Tile key={`${link.url}-${i}`} link={link} />
      ))}
    </div>
  );
}
