import { STATUS_COLOR } from "@/components/commissions/StatusChip";
import { cn } from "@/lib/cn";
import { stepIndex } from "@/lib/commissions/next-step";
import type { CommissionRequestRow } from "@/lib/supabase/types";

/*
  The five steps of a commission, each with the day it happened. Replaces the
  bare bar for clients: "when was it accepted?" is the question people ask.
*/

type Dates = Pick<CommissionRequestRow, "status" | "created_at" | "accepted_at" | "paid_at" | "delivered_at" | "completed_at">;

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

export default function RequestProgress({ req }: { req: Dates }) {
  const stopped = req.status === "declined" || req.status === "cancelled";
  const at = stepIndex(req.status);
  const steps = [
    { label: "Sent", date: req.created_at },
    { label: "Accepted", date: req.accepted_at },
    { label: "Paid", date: req.paid_at },
    { label: "Delivered", date: req.delivered_at },
    { label: "Completed", date: req.completed_at },
  ];

  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">
      {steps.map((step, i) => {
        const done = stopped ? i === 0 : i <= at;
        const current = !stopped && i === at;
        return (
          <li key={step.label} className="flex min-w-0 flex-col gap-2" aria-current={current ? "step" : undefined}>
            <span className={cn("h-1 w-full", !done && "bg-line")} style={done ? { background: STATUS_COLOR[req.status] } : undefined} />
            <span className="flex flex-col">
              <span className={cn("truncate text-[12px] leading-tight sm:text-[13px]", done ? "font-medium text-ink" : "text-ink-faint")}>
                {step.label}
              </span>
              <span className="text-[12px] leading-tight text-ink-faint tabular-nums">{done ? (day(step.date) ?? "Done") : "\u00a0"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
