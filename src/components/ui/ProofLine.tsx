import { formatStat } from "@/lib/stats";
import { cn } from "@/lib/cn";

type Stat = { value: number; suffix: string; label: string };

/** The numbers a visitor needs before they scroll: static, compact, no animation. */
export default function ProofLine({ stats, note, className }: { stats: Stat[]; note?: string; className?: string }) {
  if (stats.length === 0 && !note) return null;
  return (
    <div className={cn("flex flex-col gap-4 border-t border-line pt-5", className)}>
      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {stats.slice(0, 4).map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <dt className="order-1 text-body-sm text-ink-muted">{stat.label}</dt>
              <dd className="font-display text-xl font-semibold tabular-nums tracking-[-0.02em] text-ink">
                {formatStat(stat)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {note && (
        <p className="flex items-center gap-2 text-body-sm text-ink">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-accent" />
          {note}
        </p>
      )}
    </div>
  );
}
