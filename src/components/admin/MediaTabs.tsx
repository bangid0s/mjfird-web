import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/media", label: "Site media" },
  { href: "/admin/media/client", label: "Client files" },
] as const;

/** Switch between the public media library and private commission uploads. */
export default function MediaTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div role="tablist" aria-label="File sections" className="mb-8 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
      {TABS.map((tab) => {
        const selected = tab.href === active;
        return (
          <Link
            key={tab.href}
            role="tab"
            aria-selected={selected}
            href={tab.href}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center border-b-2 px-3 py-2.5 text-body-sm transition-colors",
              selected ? "border-accent font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
