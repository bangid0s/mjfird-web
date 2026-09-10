import { cn } from "@/lib/cn";
import Reveal from "@/components/motion/Reveal";

export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  /** Optional standfirst under the title. */
  description?: string;
  /** Optional trailing control — a "view all" link, a filter, a count. */
  action?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "mb-10 flex flex-col gap-6 sm:mb-14",
        action && "sm:flex-row sm:items-end sm:justify-between",
        align === "right" && "items-end text-right",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <p className="eyebrow eyebrow-accent">{eyebrow}</p>
        <h2 className="display-md max-w-2xl">{title}</h2>
        {description && (
          <p className="mt-1 max-w-xl text-body-lg text-pretty text-ink-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
