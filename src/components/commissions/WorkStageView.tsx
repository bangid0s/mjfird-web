import { cn } from "@/lib/cn";

/*
  The row of work stages — done, now, still to come — shared by the client's
  request page and the admin's. Server-safe (no hooks).
*/
export function StageTrack({ stages, index }: { stages: string[]; index: number }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-1.5" aria-label="Work stages">
      {stages.map((name, i) => (
        <li
          key={`${i}-${name}`}
          aria-current={i === index ? "step" : undefined}
          className={cn(
            "flex min-w-[6.5rem] flex-1 flex-col gap-0.5 border px-3 py-2",
            i < index && "border-transparent bg-[color-mix(in_oklab,var(--color-status-progress)_10%,transparent)]",
            i === index && "border-2 border-[var(--color-status-progress)] bg-bg",
            i > index && "border-dashed border-line",
          )}
        >
          <StageLabel name={name} done={i < index} upcoming={i > index} />
          <span className={cn("text-[12px]", i === index ? "font-medium text-[var(--color-status-progress)]" : "text-ink-faint")}>
            {i < index ? "Done" : i === index ? "In the works" : `Step ${i + 1}`}
          </span>
        </li>
      ))}
    </ol>
  );
}

function StageLabel({ name, done, upcoming }: { name: string; done: boolean; upcoming: boolean }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-body-sm font-medium", upcoming ? "text-ink-faint" : "text-ink")}>
      {done && (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 text-[var(--color-status-progress)]" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="m3.5 8.5 3 3 6-7" />
        </svg>
      )}
      {name}
    </span>
  );
}
