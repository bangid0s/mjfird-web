import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/admin/format";
import type { StageEventView } from "@/lib/commissions/stage-events";
import type { StageStatus } from "@/lib/supabase/types";

/*
  Shared by the client's request page and the admin's: the row of stages
  (done, current, still to come) and the history of shares, approvals and
  change requests. Server-safe — no hooks — so both sides can use it.
*/

/** The current stage takes the colour of what it's waiting on. */
const CURRENT_COLOR: Record<StageStatus, string> = {
  working: "var(--color-status-progress)",
  review: "var(--color-accent-strong)",
  approved: "var(--color-status-completed)",
  changes: "var(--color-status-pending)",
};

const STATUS_TEXT: Record<StageStatus, string> = {
  working: "In the works",
  review: "Up for review",
  approved: "Approved",
  changes: "Changes requested",
};

export function StageTrack({ stages, index, status }: { stages: string[]; index: number; status: StageStatus }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-1.5" aria-label="Work stages">
      {stages.map((name, i) => {
        const done = i < index;
        const current = i === index;
        return (
          <li
            key={`${i}-${name}`}
            aria-current={current ? "step" : undefined}
            style={
              done || current
                ? ({ "--status": current ? CURRENT_COLOR[status] : "var(--color-status-progress)" } as React.CSSProperties)
                : undefined
            }
            className={cn(
              "flex min-w-[6.5rem] flex-1 flex-col gap-0.5 border px-3 py-2",
              done && "border-transparent bg-[color-mix(in_oklab,var(--status)_10%,transparent)]",
              current && "border-2 border-[var(--status)] bg-bg",
              !done && !current && "border-dashed border-line",
            )}
          >
            <span className={cn("flex items-center gap-1.5 text-body-sm font-medium", done || current ? "text-ink" : "text-ink-faint")}>
              {done && (
                <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 text-[var(--status)]" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              )}
              {name}
            </span>
            <span className={cn("text-[12px]", current ? "font-medium text-[var(--status)]" : "text-ink-faint")}>
              {done ? "Done" : current ? STATUS_TEXT[status] : `Step ${i + 1}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const KIND_TEXT: Record<StageEventView["kind"], (stage: string) => string> = {
  shared: (s) => `${s} shared for review`,
  approved: (s) => `${s} approved`,
  changes: (s) => `Changes asked for on ${s}`,
  advanced: (s) => `Started ${s}`,
};

export function StagePreviews({ previews, large = false }: { previews: StageEventView["previews"]; large?: boolean }) {
  if (previews.length === 0) return null;
  return (
    <ul className={cn("grid gap-2", large ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-3 sm:grid-cols-4")}>
      {previews.map((p) => (
        <li key={p.url}>
          <a href={p.url} target="_blank" rel="noreferrer" className="group block overflow-hidden border border-line bg-bg-raised-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.name}
              loading="lazy"
              className={cn("w-full object-contain transition-transform group-hover:scale-[1.02]", large ? "max-h-[28rem]" : "aspect-square object-cover")}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function StageHistory({ events, clientName }: { events: StageEventView[]; clientName: string }) {
  if (events.length === 0) return null;
  return (
    <ol className="flex flex-col">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
          <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-body-sm font-medium text-ink">{KIND_TEXT[e.kind](e.stage_name)}</span>
            <span className="text-[12px] text-ink-faint">
              {e.from_admin ? "MJFIRD" : clientName}, {timeAgo(e.created_at)}
            </span>
          </p>
          {e.note && <p className="whitespace-pre-line text-body-sm text-pretty text-ink-muted">{e.note}</p>}
          <StagePreviews previews={e.previews} />
        </li>
      ))}
    </ol>
  );
}

/** The most recent share for the current stage: what the client is reviewing. */
export function latestShare(events: StageEventView[], stageIndex: number) {
  return [...events].reverse().find((e) => e.kind === "shared" && e.stage_index === stageIndex) ?? null;
}

/** The most recent client note asking for changes on the current stage. */
export function latestChanges(events: StageEventView[], stageIndex: number) {
  return [...events].reverse().find((e) => e.kind === "changes" && e.stage_index === stageIndex) ?? null;
}
