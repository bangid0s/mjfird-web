"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export default function FilterChips({
  options,
  onChange,
}: {
  options: string[];
  onChange: (active: string) => void;
}) {
  const [active, setActive] = useState("All");
  const all = ["All", ...options];

  const select = (option: string) => {
    setActive(option);
    onChange(option);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {all.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => select(option)}
          data-cursor="view"
          className={cn(
            "border px-4 py-2 font-mono text-label uppercase tracking-[0.1em] transition-colors duration-[var(--duration-fast)]",
            active === option
              ? "border-accent bg-accent text-accent-ink"
              : "border-line text-ink-muted hover:border-ink hover:text-ink",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
