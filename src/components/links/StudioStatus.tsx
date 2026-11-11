"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatDuration, getStudioStatus, type StudioHours, type StudioStatus } from "@/lib/studio-hours";

// One slim line under the identity card: is the studio at the desk, and what
// time is it there. The server-computed status seeds the first render so
// hydration matches, then a timer keeps it honest.
//
// Closed is the state most visitors meet (anyone outside office hours in one
// timezone), so it is written as what happens next rather than as a shut door:
// when the studio opens, and that a message sent now is waiting when it does.
export default function StudioStatusBar({
  hours,
  initial,
}: {
  hours: StudioHours;
  initial: StudioStatus;
}) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    const tick = () => setStatus(getStudioStatus(hours));
    tick();
    // The line is to the minute; a 15s tick keeps it right without waking the
    // page every second.
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [hours]);

  const wait = status.minutesUntilChange === null ? null : formatDuration(status.minutesUntilChange);
  const headline = status.open
    ? "Studio open"
    : wait
      ? `Studio opens in ${wait}`
      : "Studio closed";
  const detail = status.open
    ? wait && `Closes in ${wait}`
    : "Send your brief now and it gets read first.";

  // "Asia/Jakarta" → "Jakarta"; the full zone stays in the title.
  const city = hours.timezone.split("/").pop()?.replace(/_/g, " ") || hours.timezone;

  return (
    <section
      aria-label="Studio hours"
      className="flex items-center justify-between gap-4 border border-line bg-bg-raised px-4 py-2.5"
    >
      <p className="flex min-w-0 items-center gap-3 text-body-sm">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          {status.open && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status.open ? "bg-success" : "border border-ink-faint",
            )}
          />
        </span>
        <span className="min-w-0 truncate">
          <span className={cn("font-medium", status.open ? "text-success" : "text-ink")}>{headline}</span>
          {detail && <span className="hidden text-ink-muted sm:inline"> · {detail}</span>}
        </span>
      </p>

      <p className="shrink-0 text-body-sm text-ink-muted" title={hours.timezone}>
        <span className="font-mono tabular-nums text-ink">{status.time}</span> in {city}
      </p>
    </section>
  );
}
