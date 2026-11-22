import Link from "next/link";
import { cn } from "@/lib/cn";
import { slotLabel, slotLabelShort, type SlotState } from "@/lib/slots";

/*
  The studio's monthly capacity as a small status pill. Renders nothing when
  no capacity is set. Visible scarcity: a client sees that a 7+ day delivery
  is real, and that a slot this month is worth taking now.
*/
export default function SlotBadge({
  state,
  short = false,
  href,
  className,
}: {
  state: SlotState;
  /** The nav's compact "3/6 slots open". */
  short?: boolean;
  href?: string;
  className?: string;
}) {
  const label = short ? slotLabelShort(state) : slotLabel(state);
  if (!label) return null;
  const open = state.kind === "open";
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", open ? "bg-accent motion-safe:animate-pulse" : "bg-ink-muted")}
      />
      {label}
    </>
  );
  const classes = cn(
    "spec inline-flex items-center gap-2 border px-2.5 py-1",
    open ? "border-accent/40 text-ink" : "border-line-strong text-ink-muted",
    href && "transition-colors hover:border-ink hover:text-ink",
    className,
  );
  return href ? (
    <Link href={href} className={classes} aria-label={slotLabel(state) ?? undefined}>
      {body}
    </Link>
  ) : (
    <span className={classes}>{body}</span>
  );
}
