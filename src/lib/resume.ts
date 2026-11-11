// Pure helpers behind /resume. Everything here reads the free-text `period`
// the admin typed ("2018 — 2021", "Mar 2021 – Present", "2025") and never
// invents a date that isn't in it.

const PRESENT = /present|now|current|ongoing|sekarang|kini/i;

type Dated = { period: string };

/** Every four-digit year in a period, in the order it was typed. */
export function yearsIn(period: string): number[] {
  return (period.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number);
}

/**
 * Still running: the period says so in words, or it is a range whose end year
 * hasn't passed yet. A lone year ("2025") is a dated gig, not an open role.
 */
export function isCurrentPeriod(period: string, nowYear: number): boolean {
  if (PRESENT.test(period)) return true;
  const years = yearsIn(period);
  return years.length >= 2 && years[years.length - 1] >= nowYear;
}

function startYear(period: string): number | null {
  return yearsIn(period)[0] ?? null;
}

function endYear(period: string, nowYear: number): number | null {
  if (isCurrentPeriod(period, nowYear)) return nowYear;
  const years = yearsIn(period);
  return years.length ? years[years.length - 1] : null;
}

/** "2018 — 2021" → "3 yrs"; an open role counts up to this year. */
export function spanLabel(period: string, nowYear: number): string | null {
  const start = startYear(period);
  const end = endYear(period, nowYear);
  if (start === null || end === null) return null;
  const span = end - start;
  if (span <= 0) return null;
  return `${span} yr${span === 1 ? "" : "s"}`;
}

/**
 * Newest first: open roles, then by the year each ended. Roles that ended the
 * same year put the longer engagement first, since that is the one a reader is
 * looking for. Undated entries keep the admin's order, after the dated ones.
 */
export function sortNewestFirst<T extends Dated>(entries: T[], nowYear: number): T[] {
  const rank = (entry: T) => {
    const current = isCurrentPeriod(entry.period, nowYear);
    return {
      current,
      end: endYear(entry.period, nowYear),
      start: startYear(entry.period),
    };
  };
  return entries
    .map((entry, index) => ({ entry, index, ...rank(entry) }))
    .sort((a, b) => {
      if (a.end === null || b.end === null) {
        if (a.end === null && b.end === null) return a.index - b.index;
        return a.end === null ? 1 : -1;
      }
      if (a.current !== b.current) return a.current ? -1 : 1;
      if (a.end !== b.end) return b.end - a.end;
      if (a.start !== b.start) return (a.start ?? 0) - (b.start ?? 0);
      return a.index - b.index;
    })
    .map((item) => item.entry);
}

/**
 * The role to name in the "Currently" fact: the newest open one. With nothing
 * open there is no current role to claim, so the caller falls back to
 * "Most recently".
 */
export function currentEntry<T extends Dated>(sorted: T[], nowYear: number): T | null {
  return sorted.find((entry) => isCurrentPeriod(entry.period, nowYear)) ?? null;
}

/** Whole years since the earliest dated entry began. */
export function yearsOfPractice(entries: Dated[], nowYear: number): number | null {
  const starts = entries.map((entry) => startYear(entry.period)).filter((y): y is number => y !== null);
  if (starts.length === 0) return null;
  const years = nowYear - Math.min(...starts);
  return years > 0 ? years : null;
}

/**
 * Splits a newest-first list into the roles shown in full and the ones folded
 * into compact rows. Recent means it ended within `recentYears`; the count is
 * then held between `min` and `max` so a long career doesn't run ten rows
 * deep and a quiet few years don't leave the section empty.
 */
export function splitRecent<T extends Dated>(
  sorted: T[],
  nowYear: number,
  { recentYears = 3, min = 3, max = 6 }: { recentYears?: number; min?: number; max?: number } = {},
): { recent: T[]; earlier: T[] } {
  const recentCount = sorted.filter((entry) => {
    const end = endYear(entry.period, nowYear);
    return end !== null && end >= nowYear - recentYears;
  }).length;
  let keep = Math.min(max, Math.max(min, recentCount));
  // One leftover row isn't worth a fold of its own.
  if (sorted.length - keep === 1) keep = sorted.length;
  return { recent: sorted.slice(0, keep), earlier: sorted.slice(keep) };
}

/**
 * Education folds differently: the top qualification stands in full and, only
 * when there are three or more rows, the schools behind it go compact.
 */
export function splitEducation<T>(sorted: T[]): { recent: T[]; earlier: T[] } {
  if (sorted.length < 3) return { recent: sorted, earlier: [] };
  return { recent: sorted.slice(0, 1), earlier: sorted.slice(1) };
}

/**
 * A five-step meter for the language levels people actually type. Anything
 * unrecognised gets no meter rather than a guessed one.
 */
export function languageLevel(level: string): number | null {
  const l = level.toLowerCase();
  if (/native|mother|bilingual|asli|ibu/.test(l)) return 5;
  if (/fluent|c2|c1|proficient|lancar/.test(l)) return 4;
  if (/professional|advanced|b2|upper/.test(l)) return 4;
  if (/intermediate|conversational|b1|menengah/.test(l)) return 3;
  if (/elementary|basic|a2|a1|beginner|dasar/.test(l)) return 2;
  return null;
}

/**
 * A title someone typed with caps lock on ("INFORMATION TECHNOLOGY OF DIGITAL
 * MULTIMEDIA") set in title case. Short all-caps strings are left alone — they
 * are almost always acronyms or brand names ("MJFIRD", "UI/UX").
 */
export function calmCaps(text: string): string {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12 || letters !== letters.toUpperCase() || !/\s/.test(text.trim())) return text;
  const small = new Set(["of", "and", "the", "in", "for", "to", "at", "on", "a", "an"]);
  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((word, i) => (i > 0 && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
}
