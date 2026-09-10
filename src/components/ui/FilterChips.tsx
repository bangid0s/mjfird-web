"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { easeFreeze } from "@/lib/motion";

export default function FilterChips({
  options,
  onChange,
}: {
  options: string[];
  onChange: (active: string) => void;
}) {
  const [active, setActive] = useState("All");
  // Namespaced so two filter rows on one page can't share an indicator.
  const layoutId = `filter-pill-${useId()}`;
  const all = ["All", ...options];

  const select = (option: string) => {
    setActive(option);
    onChange(option);
  };

  return (
    // Scrolls sideways rather than wrapping: a wrapped pill container turns
    // into a blob at phone width. The negative margin lets it bleed into the
    // page gutter so the row reads as scrollable.
    <div className="-mx-5 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div
        role="group"
        aria-label="Filter by category"
        className="flex w-max items-center gap-1.5 rounded-full border border-line bg-bg-raised/60 p-1.5"
      >
        {all.map((option) => {
          const selected = active === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => select(option)}
              aria-pressed={selected}
              data-cursor="view"
              className={cn(
                "relative isolate rounded-full px-4 py-2 text-body-sm font-medium whitespace-nowrap transition-colors duration-[var(--duration-fast)]",
                selected ? "text-accent-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {/*
                `isolate` on the button keeps this behind the label but in
                front of the container's own translucent background — without
                it the accent washes out through the panel behind it.
              */}
              {selected && (
                <motion.span
                  layoutId={layoutId}
                  transition={{ duration: 0.32, ease: easeFreeze }}
                  className="absolute inset-0 -z-10 rounded-full bg-accent"
                />
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
