import { cn } from "@/lib/cn";
import { STATUS_SHORT } from "@/lib/commissions/status";
import type { CommissionStatus } from "@/lib/supabase/types";

/*
  One colour per status, from the --color-status-* tokens in globals.css:
  amber waits on the artist, a solid accent block waits on the client's payment, blue is work
  underway, violet is files ready, green is done, red declined, grey
  cancelled. The chip is a 12% tint of that colour with the text and dot in
  the full colour, so it reads as a block without shouting.
*/
export const STATUS_COLOR: Record<CommissionStatus, string> = {
  pending: "var(--color-status-pending)",
  awaiting_payment: "var(--color-accent)",
  in_progress: "var(--color-status-progress)",
  delivered: "var(--color-status-delivered)",
  completed: "var(--color-status-completed)",
  declined: "var(--color-status-declined)",
  cancelled: "var(--color-status-cancelled)",
};

export default function StatusChip({
  status,
  className,
  size = "md",
}: {
  status: CommissionStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      style={{ "--status": STATUS_COLOR[status] } as React.CSSProperties}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-medium",
        // Waiting on the client's payment is the one status they must act on,
        // so it is a solid accent block, like the "Needs you" panel.
        status === "awaiting_payment"
          ? "bg-accent text-accent-ink"
          : "bg-[color-mix(in_oklab,var(--status)_12%,transparent)] text-[var(--status)]",
        size === "sm" ? "px-2 py-0.5 text-[12px]" : "px-2.5 py-1 text-[13px]",
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {STATUS_SHORT[status]}
    </span>
  );
}
