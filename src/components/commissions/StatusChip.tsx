import { cn } from "@/lib/cn";
import { STATUS_SHORT } from "@/lib/commissions/status";
import type { CommissionStatus } from "@/lib/supabase/types";

const TONE: Record<CommissionStatus, string> = {
  pending: "border-line-strong text-ink",
  awaiting_payment: "border-accent text-ink",
  in_progress: "border-accent bg-accent text-accent-ink",
  delivered: "border-ink bg-ink text-bg",
  completed: "border-line text-ink-muted",
  declined: "border-line text-ink-faint",
  cancelled: "border-line text-ink-faint",
};

export default function StatusChip({ status, className }: { status: CommissionStatus; className?: string }) {
  return (
    <span className={cn("spec inline-flex items-center whitespace-nowrap border px-2.5 py-1", TONE[status], className)}>
      {STATUS_SHORT[status]}
    </span>
  );
}
