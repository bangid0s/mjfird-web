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

// Bento spans on a two-column grid of fixed-height rows. `sizes` describes the
// rendered tile width so photo tiles don't pull a full-width file for a 1x1.
const TILES: Record<LinkTileSize, { span: string; sizes: string }> = {
  small: { span: "col-span-1 row-span-1", sizes: "(min-width: 640px) 20rem, 45vw" },
  wide: { span: "col-span-2 row-span-1", sizes: "(min-width: 640px) 40rem, 92vw" },
  tall: { span: "col-span-1 row-span-2", sizes: "(min-width: 640px) 20rem, 45vw" },
  large: { span: "col-span-2 row-span-2", sizes: "(min-width: 640px) 40rem, 92vw" },
};

// Groups links under their section heading, keeping the admin's sort order and
// the order in which each heading first appears. Links with no section render
// first, ungrouped.
function groupBySection(items: LinkItem[]) {
  const groups: { section: string; items: LinkItem[] }[] = [];
  for (const item of items) {
    const section = item.section.trim();
    const existing = groups.find((group) => group.section === section);
    if (existing) existing.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}

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

  return (
    <div className="flex flex-col gap-6">
      {groupBySection(items).map((group, i) => (
        <div key={`${group.section}-${i}`} className="flex flex-col gap-3">
          {group.section && (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                {group.section}
              </h2>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}
          {/* Dense flow backfills the holes a tall or wide tile leaves behind,
              so the grid stays solid whatever mix of sizes is set. */}
          <div className="grid auto-rows-[8.5rem] grid-flow-row-dense grid-cols-2 gap-3 sm:auto-rows-[12rem]">
            {group.items.map((link, j) => (
              <Tile key={`${link.url}-${j}`} link={link} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
