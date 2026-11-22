/*
  Size budget for everything stored in the public `media` bucket: at most
  300 KB and 2400px on the long edge, as WebP. Used by the admin uploaders
  (browser, canvas) and by delivered commissions going to the gallery
  (server, sharp). The search is encoder-agnostic so both share one rule.

  Strategy: keep as many pixels as the budget allows. For each long edge,
  from largest to smallest, try the lowest acceptable quality first; if even
  that is over budget, go one size down. Once a size fits, take the highest
  quality that still fits. Painted art looks better a little softer at a
  larger size than crisp but tiny, and this costs only a handful of encodes.
*/

export const MEDIA_MAX_BYTES = 300 * 1024;
export const MEDIA_MAX_EDGE = 2400;

const EDGES = [2400, 2000, 1800, 1600, 1400, 1200, 1000];
/** Highest first; the last one is the floor tried at every size. */
const QUALITIES = [86, 80, 74];
/** Only when nothing fits at 1000px and q74 (very noisy textures). */
const LAST_RESORT = [66, 58, 50, 42];

export type Attempt = { edge: number; quality: number };

/** Long edges to try for an image whose long edge is `longEdge`. Never upscales. */
export function budgetEdges(longEdge: number): number[] {
  const top = Math.min(Math.max(1, Math.round(longEdge)), MEDIA_MAX_EDGE);
  return [top, ...EDGES.filter((e) => e < top)];
}

export async function fitToBudget<T extends { size: number }>(
  longEdge: number,
  encode: (attempt: Attempt) => Promise<T>,
  maxBytes = MEDIA_MAX_BYTES,
): Promise<{ out: T; attempt: Attempt; fits: boolean }> {
  const edges = budgetEdges(longEdge);
  const floorQ = QUALITIES[QUALITIES.length - 1];
  let last: { out: T; attempt: Attempt } | null = null;

  for (const edge of edges) {
    const floor = { edge, quality: floorQ };
    const atFloor = await encode(floor);
    last = { out: atFloor, attempt: floor };
    if (atFloor.size > maxBytes) continue;
    for (const quality of QUALITIES.slice(0, -1)) {
      const attempt = { edge, quality };
      const out = await encode(attempt);
      if (out.size <= maxBytes) return { out, attempt, fits: true };
    }
    return { out: atFloor, attempt: floor, fits: true };
  }

  const smallest = edges[edges.length - 1];
  for (const quality of LAST_RESORT) {
    const attempt = { edge: smallest, quality };
    const out = await encode(attempt);
    last = { out, attempt };
    if (out.size <= maxBytes) return { ...last, fits: true };
  }
  return { ...last!, fits: false };
}
