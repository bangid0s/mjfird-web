/** Newest first, then the first `keep` are shown and the rest sit behind a toggle. */
export function splitTimeline<T extends { year: string }>(items: T[], keep = 6): { recent: T[]; older: T[] } {
  const first = Number.parseInt(items[0]?.year ?? "", 10);
  const last = Number.parseInt(items[items.length - 1]?.year ?? "", 10);
  const ordered = Number.isFinite(first) && Number.isFinite(last) && first < last ? [...items].reverse() : items;
  return { recent: ordered.slice(0, keep), older: ordered.slice(keep) };
}
