"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatDuration, getStudioStatus, type StudioHours, type StudioStatus } from "@/lib/studio-hours";

// Live open/closed strip with a dual clock: the visitor's own time next to the
// studio's. The server-computed status seeds the first render so hydration
// matches; the visitor's clock starts blank because only the browser knows it.
//
// Laid out as three spec cells on one hairline row — status, studio clock,
// visitor clock — so it reads at a glance instead of as a sentence.
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

  const change =
    status.minutesUntilChange === null
      ? null
      : `${status.open ? "Closes" : "Opens"} in ${formatDuration(status.minutesUntilChange)}`;

  // "Asia/Jakarta" → "Jakarta" for the cell label; the full zone stays in the title.
  const city = hours.timezone.split("/").pop()?.replace(/_/g, " ") || hours.timezone;

  return (
    <section
      aria-label="Studio hours"
      className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-[1fr_auto_auto]"
    >
      <div className="col-span-2 flex min-w-0 items-center gap-3 bg-bg-raised px-4 py-3 sm:col-span-1">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          {status.open && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status.open ? "bg-success" : "bg-ink-faint",
            )}
          />
        </span>
        <p className="min-w-0 truncate font-body text-body-sm text-ink">
          <span className={cn("font-medium", status.open ? "text-success" : "text-ink")}>
            {status.open ? "Studio open" : "Studio closed"}
          </span>
          {change && <span className="text-ink-muted"> · {change}</span>}
        </p>
      </div>

      <div className="flex flex-col justify-center bg-bg-raised px-4 py-2.5" title={hours.timezone}>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          {city}
        </span>
        <span className="font-mono text-body-sm tabular-nums text-ink">
          {status.time} <span className="text-ink-faint">{status.day}</span>
        </span>
      </div>

      <div className="flex flex-col justify-center bg-bg-raised px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Your time
        </span>
        <span className="font-mono text-body-sm tabular-nums text-ink">{viewerTime ?? "--:--"}</span>
      </div>
    </section>
  );
}
