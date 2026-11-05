import { cn } from "@/lib/cn";
import { STATUS_FLOW, STATUS_SHORT } from "@/lib/commissions/status";
import type { CommissionStatus } from "@/lib/supabase/types";

export default function Timeline({ status }: { status: CommissionStatus }) {
  const stopped = status === "declined" || status === "cancelled";
  const at = STATUS_FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">
      {STATUS_FLOW.map((step, i) => {
        const done = !stopped && i <= at;
        return (
          <li key={step} className="flex flex-col gap-2">
            <span className={cn("h-1 w-full", done ? "bg-accent" : "bg-line")} />
            <span className={cn("hidden text-[12px] leading-tight sm:block", done ? "text-ink" : "text-ink-faint")}>
              {STATUS_SHORT[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
