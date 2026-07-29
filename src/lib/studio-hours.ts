// Opening-hours maths for the links page status bar. Everything is wall-clock
// in the studio's IANA timezone — no offset arithmetic — so DST is handled by
// Intl rather than by us.

export type StudioHours = {
  timezone: string;
  openTime: string; // "09:00"
  closeTime: string; // "17:00"
  openDays: number[]; // 0 = Sunday … 6 = Saturday
};

export type StudioStatus = {
  open: boolean;
  /** Minutes until the studio next closes (when open) or opens (when closed). */
  minutesUntilChange: number | null;
  /** Wall-clock time in the studio's zone, "HH:MM". */
  time: string;
  /** Short weekday in the studio's zone, e.g. "Wed". */
  day: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTES_PER_DAY = 1440;

export function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(h)) return 0;
  return Math.min(MINUTES_PER_DAY - 1, Math.max(0, h * 60 + (Number.isFinite(m) ? m : 0)));
}

export function parseOpenDays(value: string): number[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ),
  ].sort();
}

/** Wall-clock parts for a moment as seen in `timeZone`. */
export function zonedParts(date: Date, timeZone: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
  } catch {
    // Unknown timezone string — fall back to the runtime's own zone.
    parts = new Intl.DateTimeFormat("en-US", {
      hourCycle: "h23",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
  }
  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekday = find("weekday");
  const hour = Number.parseInt(find("hour"), 10) % 24;
  const minute = Number.parseInt(find("minute"), 10);
  const second = Number.parseInt(find("second"), 10);
  const dayIndex = WEEKDAYS.indexOf(weekday);

  return {
    weekday,
    dayIndex: dayIndex === -1 ? 0 : dayIndex,
    hour,
    minute,
    second,
    minutesOfDay: hour * 60 + minute,
  };
}

export function formatClock(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "8h 8m", "45m", "2d 3h" — compact and human. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

export function getStudioStatus(hours: StudioHours, now: Date = new Date()): StudioStatus {
  const { dayIndex, hour, minute, minutesOfDay, weekday } = zonedParts(now, hours.timezone);
  const time = formatClock(hour, minute);
  const openMin = parseTimeToMinutes(hours.openTime);
  const closeMin = parseTimeToMinutes(hours.closeTime);
  const days = hours.openDays;

  if (days.length === 0 || openMin === closeMin) {
    return { open: false, minutesUntilChange: null, time, day: weekday };
  }

  const yesterday = (dayIndex + 6) % 7;
  const overnight = closeMin < openMin; // e.g. 20:00 → 02:00

  const open = overnight
    ? (days.includes(dayIndex) && minutesOfDay >= openMin) ||
      (days.includes(yesterday) && minutesOfDay < closeMin)
    : days.includes(dayIndex) && minutesOfDay >= openMin && minutesOfDay < closeMin;

  if (open) {
    const untilClose = overnight
      ? minutesOfDay >= openMin
        ? MINUTES_PER_DAY - minutesOfDay + closeMin
        : closeMin - minutesOfDay
      : closeMin - minutesOfDay;
    return { open: true, minutesUntilChange: untilClose, time, day: weekday };
  }

  // Closed: find the next opening within the coming week.
  for (let offset = 0; offset <= 7; offset++) {
    if (!days.includes((dayIndex + offset) % 7)) continue;
    const startsAt = offset * MINUTES_PER_DAY + openMin;
    if (startsAt >= minutesOfDay) {
      return { open: false, minutesUntilChange: startsAt - minutesOfDay, time, day: weekday };
    }
  }

  return { open: false, minutesUntilChange: null, time, day: weekday };
}
