"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export type LinksTab = { id: string; label: string };

// Tabbed panels following the ARIA tabs pattern: arrow keys move between tabs
// (Tab itself keeps its normal meaning so keyboard users can still leave the
// list), and Escape backs out to the main site.
export default function LinksTabs({
  tabs,
  panels,
}: {
  tabs: LinksTab[];
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (tabs.length === 0) return null;

  const focusTab = (id: string) => {
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    focusTab(tabs[next].id);
  };

  // A single tab is just a heading for itself — render the panel bare.
  if (tabs.length === 1) return <>{panels[tabs[0].id]}</>;

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Links sections" className="flex flex-wrap gap-2">
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`links-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`links-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={cn(
                "rounded-xl px-5 py-2.5 font-mono text-label uppercase tracking-[0.15em] transition-colors duration-[var(--duration-fast)]",
                selected
                  ? "bg-accent/15 text-accent ring-1 ring-accent/50"
                  : "bg-bg-raised text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`links-panel-${tab.id}`}
          aria-labelledby={`links-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="focus-visible:outline-none"
        >
          {tab.id === active && panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
