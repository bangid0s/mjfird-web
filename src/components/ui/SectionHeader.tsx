import { cn } from "@/lib/cn";
import Reveal from "@/components/motion/Reveal";

export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  index,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  /** Optional standfirst under the title. */
  description?: string;
  /** Optional trailing control — a "view all" link, a filter, a count. */
  action?: React.ReactNode;
  /** Section number, printed in the top rule like a spec sheet. */
  index?: number;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-12 flex flex-col gap-7 sm:mb-16", className)}>
      {/* Spec rule: number on the left, label on the right, hairline between. */}
      <div className="flex items-center gap-4 border-t border-line pt-4">
        {index !== undefined && (
          <span className="mono-meta text-ink">{String(index).padStart(2, "0")}</span>
        )}
        <span className="eyebrow">{eyebrow}</span>
      </div>

      <div
        className={cn(
          "flex flex-col gap-5",
          action && "sm:flex-row sm:items-end sm:justify-between",
          align === "right" && "items-end text-right",
        )}
      >
        <div className="flex flex-col gap-4">
          <h2 className="display-md max-w-2xl">{title}</h2>
          {description && (
            <p className="max-w-xl text-body-lg text-pretty text-ink-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Reveal>
  );
}
