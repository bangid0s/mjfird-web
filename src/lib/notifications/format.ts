/*
  Small pure helpers for the notification bell, kept apart from the
  component so they can be tested without a browser.
*/

/** "just now", "5m", "3h", "2d", then a short date. */
export function timeAgo(iso: string, now: number = Date.now()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Badge text: nothing at zero, capped so it fits the dot. */
export function badgeLabel(unread: number) {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 9 ? "9+" : String(Math.floor(unread));
}

/** Only follow same-site paths stored on a notification. */
export function safeHref(href: string | null | undefined) {
  if (!href || !href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\")) return "/account";
  return href;
}
