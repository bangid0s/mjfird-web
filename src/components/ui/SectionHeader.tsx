import { cn } from "@/lib/cn";

export default function SectionHeader({
  eyebrow,
  title,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div className={cn("mb-12 flex flex-col gap-3", align === "right" && "items-end text-right", className)}>
      <p className="font-mono text-label uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
      <h2 className="font-display text-display-md uppercase leading-[0.9] text-ink">{title}</h2>
    </div>
  );
}
