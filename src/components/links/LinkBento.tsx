import Link from "next/link";
import type { CSSProperties } from "react";
import SmartImage from "@/components/media/SmartImage";
import { cn } from "@/lib/cn";
import { groupBySection, packTiles, tileGridArea } from "@/lib/link-tiles";
import type { LinkItem } from "@/lib/data/links";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

// The grid runs 2 columns on phones, 3 from tablet, 4 on desktop, and the row
// height grows with it so a tile keeps roughly the same shape at every width.
// Each tile is placed explicitly: packTiles works out a hole-free layout per
// column count and the three results ride in as custom properties, so the
// breakpoint just picks which one applies.
const GRID =
  "grid auto-rows-[9.5rem] grid-cols-2 gap-2 sm:auto-rows-[11rem] sm:grid-cols-3 sm:gap-3 lg:auto-rows-[12rem] lg:grid-cols-4";
const PLACE = "[grid-area:var(--at-2)] sm:[grid-area:var(--at-3)] lg:[grid-area:var(--at-4)]";

const SMALL_SIZES = "(min-width: 1024px) 15rem, (min-width: 640px) 13rem, 45vw";
const BIG_SIZES = "(min-width: 1024px) 30rem, (min-width: 640px) 27rem, 92vw";

type Tone = "photo" | "accent" | "plain";

// Three tile tones, so the grid has a hierarchy instead of a wall of one
// colour: a photo carries itself, a highlighted link takes the accent fill,
// everything else is a quiet raised sheet that lights up on hover.
const TONE: Record<Tone, { tile: string; meta: string; chip: string; arrow: string }> = {
  photo: {
    tile: "border-transparent bg-black text-white",
    meta: "text-white/80",
    chip: "border-white/25 bg-black/35 backdrop-blur-md",
    arrow: "border-white/30 bg-black/30 backdrop-blur-md group-hover:bg-white group-hover:text-black",
  },
  accent: {
    tile: "border-accent bg-accent text-accent-ink",
    meta: "text-accent-ink/85",
    chip: "border-accent-ink/25 bg-accent-ink/10",
    arrow: "border-accent-ink/35 group-hover:bg-accent-ink group-hover:text-accent",
  },
  plain: {
    tile: "border-line bg-bg-raised text-ink hover:border-ink/40 hover:bg-bg",
    meta: "text-ink-muted",
    chip: "border-line bg-bg",
    arrow: "border-line group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink",
  },
};

function Tile({
  link,
  style,
  big,
  order,
}: {
  link: LinkItem;
  style: CSSProperties;
  /** Two columns wide on desktop: larger type, and a larger image request. */
  big: boolean;
  /** Position on the page, for the staggered entrance. */
  order: number;
}) {
  const external = isExternal(link.url);
  const tone: Tone = link.imageUrl ? "photo" : link.highlight ? "accent" : "plain";
  const t = TONE[tone];

  const inner = (
    <>
      {tone === "photo" && (
        <>
          <SmartImage
            src={link.imageUrl}
            sizes={big ? BIG_SIZES : SMALL_SIZES}
            priority={order < 2}
            className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]"
          />
          {/* Scrim only where the type sits, so the photo stays clean above it. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
          />
        </>
      )}

      <span className="relative flex items-start justify-between gap-2">
        {link.emoji ? (
          <span
            aria-hidden="true"
            className={cn("flex h-9 w-9 items-center justify-center border text-base leading-none", t.chip)}
          >
            {link.emoji}
          </span>
        ) : (
          <span />
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
        <span
          className={cn(
            "line-clamp-2 font-display font-semibold leading-[1.15] tracking-[-0.02em]",
            big ? "text-lg sm:text-xl" : "text-[0.95rem] sm:text-base",
          )}
        >
          {link.label}
        </span>
        {link.description && (
          <span className={cn("mt-1 line-clamp-1 text-label sm:line-clamp-2 sm:text-body-sm", t.meta)}>
            {link.description}
          </span>
        )}
      </span>
    </>
  );

  const classes = cn(
    "group relative flex flex-col overflow-hidden border p-3 sm:p-4",
    PLACE,
    t.tile,
    "motion-safe:animate-rise",
    "transition-[background-color,border-color] duration-[var(--duration-base)] ease-[var(--ease-swing)]",
  );
  // One entrance for the whole grid, each tile a beat behind the last. Capped
  // so a long list doesn't keep the bottom rows waiting.
  const placed = { ...style, animationDelay: `${Math.min(order, 8) * 45}ms` };

  return external ? (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={classes} style={placed}>
      {inner}
    </a>
  ) : (
    <Link href={link.url} className={classes} style={placed}>
      {inner}
    </Link>
  );
}

function Grid({ items, offset }: { items: LinkItem[]; offset: number }) {
  const sizes = items.map((item) => item.size);
  const at = { 2: packTiles(sizes, 2), 3: packTiles(sizes, 3), 4: packTiles(sizes, 4) };

  return (
    <div className={GRID}>
      {items.map((link, i) => (
        <Tile
          key={`${link.url}-${i}`}
          link={link}
          order={offset + i}
          big={at[4][i].w >= 2}
          style={
            {
              "--at-2": tileGridArea(at[2][i]),
              "--at-3": tileGridArea(at[3][i]),
              "--at-4": tileGridArea(at[4][i]),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * The links themselves. Links that share a section name sit under that name as
 * a heading; links with none run as one unlabelled grid. Each group is packed
 * on its own, so a heading never lands in the middle of a tile's row.
 */
export default function LinkBento({ items }: { items: LinkItem[] }) {
  if (items.length === 0) return null;
  const groups = groupBySection(items);
  // Where each group starts in page order, for the staggered entrance.
  const offsets = groups.map((_, i) => groups.slice(0, i).reduce((sum, group) => sum + group.items.length, 0));

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {groups.map((group, i) => {
        const offset = offsets[i];
        return group.section ? (
          <section key={group.section} aria-label={group.section} className="flex flex-col gap-2.5">
            <h2 className="text-body-sm font-medium text-ink-muted">{group.section}</h2>
            <Grid items={group.items} offset={offset} />
          </section>
        ) : (
          <Grid key="ungrouped" items={group.items} offset={offset} />
        );
      })}
    </div>
  );
}
