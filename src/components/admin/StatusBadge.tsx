import { cn } from "@/lib/cn";
import type { ContentStatus } from "@/lib/supabase/types";

const STYLES: Record<ContentStatus, { box: string; dot: string; label: string }> = {
  draft: { box: "border-line-strong text-ink-muted", dot: "bg-ink-faint", label: "Draft" },
  scheduled: { box: "border-accent/50 text-accent-strong", dot: "bg-accent", label: "Scheduled" },
  published: { box: "border-success/50 text-success", dot: "bg-success", label: "Published" },
};

export default function StatusBadge({ status }: { status: ContentStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-medium leading-4",
        style.box,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
