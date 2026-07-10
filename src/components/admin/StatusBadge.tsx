import { cn } from "@/lib/cn";
import type { ContentStatus } from "@/lib/supabase/types";

const STYLES: Record<ContentStatus, string> = {
  draft: "border-ink-faint text-ink-faint",
  scheduled: "border-accent-echo text-accent-echo",
  published: "border-success text-success",
};

export default function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
