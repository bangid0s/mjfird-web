import { cn } from "@/lib/cn";
import { effectiveAvailability, slotsLeft, type Availability } from "@/lib/services/storefront";

const LABEL: Record<Availability, string> = {
  open: "Open",
  waitlist: "Waitlist",
  closed: "Closed",
};

export default function AvailabilityBadge({
  availability,
  slotsTotal,
  slotsTaken,
  className,
}: {
  availability: Availability;
  slotsTotal: number | null;
  slotsTaken: number;
  className?: string;
}) {
  const status = effectiveAvailability(availability, slotsTotal, slotsTaken);
  const left = slotsLeft(slotsTotal, slotsTaken);

  return (
    <span
      className={cn(
        "spec inline-flex items-center gap-2 border px-2.5 py-1",
        status === "open" && "border-accent/40 text-ink",
        status === "waitlist" && "border-line-strong text-ink-muted",
        status === "closed" && "border-line text-ink-faint",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "open" && "bg-accent",
          status === "waitlist" && "bg-ink-muted",
          status === "closed" && "bg-ink-faint",
        )}
      />
      {LABEL[status]}
      {status === "open" && left !== null && (
        <span className="text-ink-faint">
          · {left}/{slotsTotal} slots
        </span>
      )}
    </span>
  );
}
