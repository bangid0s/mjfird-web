"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatDuration, getStudioStatus, type StudioHours, type StudioStatus } from "@/lib/studio-hours";

// Live open/closed bar with a dual clock: the visitor's own time next to the
// studio's. The server-computed status seeds the first render so hydration
// matches; the visitor's clock starts blank because only the browser knows it.
export default function StudioStatusBar({
  hours,
  initial,
}: {
  hours: StudioHours;
  initial: StudioStatus;
}) {
  const [status, setStatus] = useState(initial);
  const [viewerTime, setViewerTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      setStatus(getStudioStatus(hours));
      setViewerTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hours]);

  const summary = status.open
    ? status.minutesUntilChange === null
      ? "Studio open"
      : `Studio Open — Closes in ${formatDuration(status.minutesUntilChange)}`
    : status.minutesUntilChange === null
      ? "Studio closed"
      : `Studio Closed — Opens in ${formatDuration(status.minutesUntilChange)}`;

  return (
    <section
      aria-label="Studio hours"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-2xl border border-line bg-bg px-5 py-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          {status.open && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status.open ? "bg-success" : "bg-ink-faint",
            )}
          />
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
            status.open ? "border-success text-success" : "border-line text-ink-faint",
          )}
        >
          {status.open ? "Open" : "Closed"}
        </span>
        <p className="min-w-0 truncate font-body text-body-sm text-ink-muted">{summary}</p>
      </div>

      <dl className="ml-auto grid grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-1 text-right">
        <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Your time</dt>
        <dd className="font-mono text-body-sm tabular-nums text-ink">{viewerTime ?? "--:--"}</dd>
        <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Studio ({hours.timezone})
        </dt>
        <dd className="font-mono text-body-sm tabular-nums text-success">
          {status.time} {status.day}
        </dd>
      </dl>
    </section>
  );
}
