/*
  Review order for the public site: newest first.

  "Newest" is when the client wrote it (submitted_at). Quotes added by hand in
  admin have no submitted_at, so they date from when they were entered
  (created_at). A pinned review, when one is set, leads the home page.
*/

export type Datable = {
  featured?: boolean;
  /** ISO timestamp the review counts from. Missing sorts last. */
  postedAt?: string;
};

function time(value: string | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

/** When a review counts from: the client's submit time, else when it was entered. */
export function postedAt(row: { submitted_at?: string | null; created_at?: string | null }): string | undefined {
  return row.submitted_at || row.created_at || undefined;
}

/** Newest first. Stable for ties, so equal dates keep their incoming order. */
export function newestFirst<T extends Datable>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => time(b.item.postedAt) - time(a.item.postedAt) || a.index - b.index)
    .map(({ item }) => item);
}

/** Newest first, with the pinned review (if any) moved to the front. */
export function featuredThenNewest<T extends Datable>(items: T[]): T[] {
  const sorted = newestFirst(items);
  const pinned = sorted.findIndex((item) => item.featured);
  if (pinned <= 0) return sorted;
  return [sorted[pinned], ...sorted.slice(0, pinned), ...sorted.slice(pinned + 1)];
}
