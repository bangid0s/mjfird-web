import type { LinkTileSize } from "@/lib/supabase/types";

// How much of the two-column bento grid a link tile claims, in the order the
// admin's picker offers them.
export const LINK_TILE_SIZES: { value: LinkTileSize; label: string }[] = [
  { value: "small", label: "Small 1×1" },
  { value: "wide", label: "Wide 2×1" },
  { value: "tall", label: "Tall 1×2" },
  { value: "large", label: "Large 2×2" },
];

export function parseTileSize(value: string | null | undefined): LinkTileSize {
  return LINK_TILE_SIZES.some((size) => size.value === value)
    ? (value as LinkTileSize)
    : "small";
}

/* ------------------------------------------------------------------------ */
/* Packing                                                                   */
/* ------------------------------------------------------------------------ */

const SPANS: Record<LinkTileSize, { w: number; h: number }> = {
  small: { w: 1, h: 1 },
  wide: { w: 2, h: 1 },
  tall: { w: 1, h: 2 },
  large: { w: 2, h: 2 },
};

/** Where a tile sits: zero-based column and row, and how many of each it covers. */
export type TilePlacement = { col: number; row: number; w: number; h: number };

/**
 * Lays tiles out on a `columns`-wide grid and returns an explicit cell for
 * each, in the order given.
 *
 * Two passes. First every tile takes the earliest free slot that fits its
 * size, the same rule as CSS dense auto-flow. Then any cell left empty is
 * handed to a neighbour that can grow into it and stay a rectangle. Without
 * the second pass a handful of mixed sizes leaves gaps: three tiles sized
 * small, large, small on four columns strand an empty cell under each small
 * one.
 *
 * A tile only ever grows, so the hierarchy the admin picked survives: nothing
 * marked large comes out smaller than something marked small.
 */
export function packTiles(sizes: LinkTileSize[], columns: number): TilePlacement[] {
  const cols = Math.max(1, Math.floor(columns));
  const taken: (number | undefined)[][] = [];
  const cell = (row: number, col: number) => taken[row]?.[col];
  const free = (row: number, col: number) => col >= 0 && col < cols && row >= 0 && cell(row, col) === undefined;
  const claim = (index: number, p: TilePlacement) => {
    for (let r = p.row; r < p.row + p.h; r++) {
      taken[r] ??= [];
      for (let c = p.col; c < p.col + p.w; c++) taken[r][c] = index;
    }
  };

  const placed = sizes.map((size, index) => {
    const w = Math.min(cols, SPANS[size].w);
    const h = SPANS[size].h;
    for (let row = 0; ; row++) {
      for (let col = 0; col + w <= cols; col++) {
        let fits = true;
        for (let r = row; r < row + h && fits; r++) {
          for (let c = col; c < col + w && fits; c++) fits = free(r, c);
        }
        if (fits) {
          const p = { col, row, w, h };
          claim(index, p);
          return p;
        }
      }
    }
  });

  const rows = placed.reduce((max, p) => Math.max(max, p.row + p.h), 0);
  const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

  // Grow neighbours into holes until a pass changes nothing. Each growth
  // fills at least one cell, so this ends.
  for (let changed = true; changed; ) {
    changed = false;
    for (let row = 0; row < rows && !changed; row++) {
      for (let col = 0; col < cols && !changed; col++) {
        if (!free(row, col)) continue;
        const left = cell(row, col - 1);
        const above = cell(row - 1, col);
        const right = cell(row, col + 1);
        const below = row + 1 < rows ? cell(row + 1, col) : undefined;

        if (left !== undefined && range(placed[left].row, placed[left].h).every((r) => free(r, col))) {
          placed[left].w += 1;
          claim(left, placed[left]);
          changed = true;
        } else if (above !== undefined && range(placed[above].col, placed[above].w).every((c) => free(row, c))) {
          placed[above].h += 1;
          claim(above, placed[above]);
          changed = true;
        } else if (right !== undefined && range(placed[right].row, placed[right].h).every((r) => free(r, col))) {
          placed[right].col -= 1;
          placed[right].w += 1;
          claim(right, placed[right]);
          changed = true;
        } else if (below !== undefined && range(placed[below].col, placed[below].w).every((c) => free(row, c))) {
          placed[below].row -= 1;
          placed[below].h += 1;
          claim(below, placed[below]);
          changed = true;
        }
      }
    }
  }

  return placed;
}

/** `grid-area` for a placement: row-start / column-start / row-span / column-span. */
export function tileGridArea(p: TilePlacement): string {
  return `${p.row + 1} / ${p.col + 1} / span ${p.h} / span ${p.w}`;
}

/**
 * Splits links into runs that share a section heading, keeping the order the
 * admin set. A section that appears twice, apart, is merged into its first
 * run so a heading never repeats.
 */
export function groupBySection<T extends { section: string }>(items: T[]): { section: string; items: T[] }[] {
  const groups: { section: string; items: T[] }[] = [];
  for (const item of items) {
    const section = item.section.trim();
    const existing = groups.find((group) => group.section === section);
    if (existing) existing.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}
