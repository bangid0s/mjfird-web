import assert from "node:assert/strict";
import test from "node:test";
import { groupBySection, packTiles, tileGridArea, type TilePlacement } from "@/lib/link-tiles";
import type { LinkTileSize } from "@/lib/supabase/types";

/** Every cell covered exactly once, and how many rows the grid ran to. */
function coverage(placed: TilePlacement[], cols: number) {
  const rows = Math.max(0, ...placed.map((p) => p.row + p.h));
  const grid = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (const p of placed) {
    assert.ok(p.col >= 0 && p.col + p.w <= cols, "tile stays inside the columns");
    for (let r = p.row; r < p.row + p.h; r++) for (let c = p.col; c < p.col + p.w; c++) grid[r][c] += 1;
  }
  return { rows, holes: grid.flat().filter((n) => n === 0).length, overlaps: grid.flat().filter((n) => n > 1).length };
}

test("pack: the live links (small, large, small) close up at every column count", () => {
  const sizes: LinkTileSize[] = ["small", "large", "small"];
  for (const cols of [2, 3, 4]) {
    assert.deepEqual(coverage(packTiles(sizes, cols), cols).holes, 0, `${cols} columns`);
    assert.deepEqual(coverage(packTiles(sizes, cols), cols).overlaps, 0, `${cols} columns`);
  }
  // On four columns the smalls grow down beside the large one.
  assert.deepEqual(packTiles(sizes, 4), [
    { col: 0, row: 0, w: 1, h: 2 },
    { col: 1, row: 0, w: 2, h: 2 },
    { col: 3, row: 0, w: 1, h: 2 },
  ]);
});

test("pack: a short last row is filled, and a full grid is left exactly as set", () => {
  const five = packTiles(["small", "small", "small", "small", "small"], 4);
  assert.deepEqual(coverage(five, 4), { rows: 2, holes: 0, overlaps: 0 });
  assert.deepEqual(five[4], { col: 0, row: 1, w: 4, h: 1 });

  assert.deepEqual(packTiles(["wide", "small", "small"], 4), [
    { col: 0, row: 0, w: 2, h: 1 },
    { col: 2, row: 0, w: 1, h: 1 },
    { col: 3, row: 0, w: 1, h: 1 },
  ]);
});

test("pack: tiles only grow, wide tiles are clamped to the grid, nothing overlaps", () => {
  const sizes: LinkTileSize[] = ["tall", "wide", "small", "large", "small", "wide", "tall", "small", "small"];
  const base = { small: [1, 1], wide: [2, 1], tall: [1, 2], large: [2, 2] } as const;
  for (const cols of [1, 2, 3, 4]) {
    const placed = packTiles(sizes, cols);
    const { holes, overlaps } = coverage(placed, cols);
    assert.equal(overlaps, 0, `${cols} columns`);
    assert.equal(holes, 0, `${cols} columns`);
    placed.forEach((p, i) => {
      assert.ok(p.w >= Math.min(cols, base[sizes[i]][0]), "never narrower than asked");
      assert.ok(p.h >= base[sizes[i]][1], "never shorter than asked");
    });
  }
  assert.deepEqual(packTiles([], 4), []);
});

test("pack: grid-area is one-based row / column / spans", () => {
  assert.equal(tileGridArea({ col: 1, row: 0, w: 2, h: 2 }), "1 / 2 / span 2 / span 2");
});

test("sections: order is kept and a repeated heading merges into its first run", () => {
  const item = (label: string, section: string) => ({ label, section });
  const groups = groupBySection([item("a", "Hire"), item("b", ""), item("c", "Hire "), item("d", "Read")]);
  assert.deepEqual(groups.map((g) => [g.section, g.items.map((i) => i.label)]), [
    ["Hire", ["a", "c"]],
    ["", ["b"]],
    ["Read", ["d"]],
  ]);
});
