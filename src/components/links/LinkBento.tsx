import Link from "next/link";
import SmartImage from "@/components/media/SmartImage";
import { cn } from "@/lib/cn";
import type { LinkItem } from "@/lib/data/links";
import type { LinkTileSize } from "@/lib/supabase/types";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

// The grid runs 2 columns on phones, 3 from tablet, 4 on desktop, and the row
// height grows with it so a tile keeps roughly the same shape at every width.
// Spans stay put across breakpoints — a wide tile is always twice a small one,
// so the hierarchy the admin set survives the reflow. `sizes` tracks the
// rendered tile width so a 1x1 never pulls a full-width file.
const GRID =
  "grid auto-rows-[9.5rem] grid-flow-row-dense grid-cols-2 gap-2 sm:auto-rows-[11rem] sm:grid-cols-3 sm:gap-3 lg:auto-rows-[12rem] lg:grid-cols-4";

const SMALL_SIZES = "(min-width: 1024px) 15rem, (min-width: 640px) 13rem, 45vw";
const BIG_SIZES = "(min-width: 1024px) 30rem, (min-width: 640px) 27rem, 92vw";

const TILES: Record<LinkTileSize, { span: string; sizes: string; big: boolean }> = {
  small: { span: "col-span-1 row-span-1", sizes: SMALL_SIZES, big: false },
  wide: { span: "col-span-2 row-span-1", sizes: BIG_SIZES, big: true },
  tall: { span: "col-span-1 row-span-2", sizes: SMALL_SIZES, big: false },
  large: { span: "col-span-2 row-span-2", sizes: BIG_SIZES, big: true },
};

type Tone = "photo" | "accent" | "plain";

// Three tile tones, so the grid has a hierarchy instead of a wall of one
// colour: a photo carries itself, a highlighted link takes the accent fill,
// everything else is a quiet raised sheet that lights up on hover.
const TONE: Record<Tone, { tile: string; eyebrow: string; meta: string; chip: string; arrow: string }> = {
  photo: {
    tile: "border-transparent bg-black text-white",
    eyebrow: "text-white/65",
    meta: "text-white/75",
    chip: "border-white/25 bg-black/35 backdrop-blur-md",
    arrow: "border-white/30 bg-black/30 backdrop-blur-md group-hover:bg-white group-hover:text-black",
  },
  accent: {
    tile: "border-accent bg-accent text-accent-ink",
    eyebrow: "text-accent-ink/70",
    meta: "text-accent-ink/80",
    chip: "border-accent-ink/25 bg-accent-ink/10",
    arrow: "border-accent-ink/35 group-hover:bg-accent-ink group-hover:text-accent",
  },
  plain: {
    tile: "border-line bg-bg-raised text-ink hover:border-ink/40 hover:bg-bg",
    eyebrow: "text-ink-faint",
    meta: "text-ink-muted",
    chip: "border-line bg-bg",
    arrow: "border-line group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink",
  },
};

function Tile({ link, index }: { link: LinkItem; index: number }) {
  const tile = TILES[link.size];
  const external = isExternal(link.url);
  const tone: Tone = link.imageUrl ? "photo" : link.highlight ? "accent" : "plain";
  const t = TONE[tone];

  const inner = (
    <>
      {tone === "photo" && (
        <>
          <SmartImage
            src={link.imageUrl}
            sizes={tile.sizes}
            className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]"
          />
          {/* Scrim only where the type sits, so the photo stays clean above it. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
          />
        </>
      )}

      {/* Top row: emoji chip (or the tile's number, spec-sheet style) and the
          direction arrow. */}
      <span className="relative flex items-start justify-between gap-2">
        {link.emoji ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex h-9 w-9 items-center justify-center border text-base leading-none",
              t.chip,
            )}
          >
            {link.emoji}
          </span>
        ) : (
          <span aria-hidden="true" className={cn("font-mono text-label tabular-nums", t.eyebrow)}>
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center border text-sm transition-[background-color,border-color,color,transform] duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
            t.arrow,
          )}
        >
          {external ? "↗" : "→"}
        </span>
      </span>

      <span className="relative mt-auto flex min-w-0 flex-col">
        {link.section && (
          <span
            className={cn(
              "mb-1.5 line-clamp-1 font-mono text-[10px] uppercase tracking-[0.18em]",
              t.eyebrow,
            )}
          >
            {link.section}
          </span>
        )}
        <span
          className={cn(
            "line-clamp-2 font-display font-semibold leading-[1.15] tracking-[-0.02em]",
            tile.big ? "text-lg sm:text-xl" : "text-[0.95rem] sm:text-base",
          )}
        >
          {link.label}
        </span>
        {link.description && (
          <span className={cn("mt-1 line-clamp-2 font-body text-label sm:text-body-sm", t.meta)}>
            {link.description}
          </span>
        )}
      </span>
    </>
  );

  const classes = cn(
    "group relative flex flex-col overflow-hidden border p-3 sm:p-4",
    tile.span,
    t.tile,
    "transition-[background-color,border-color] duration-[var(--duration-base)] ease-[var(--ease-swing)]",
  );

  return external ? (
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
        <Tile key={`${link.url}-${i}`} link={link} index={i} />
      ))}
    </div>
  );
}
