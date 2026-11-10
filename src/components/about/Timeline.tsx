"use client";

import { useState } from "react";
import { splitTimeline } from "@/lib/timeline";

type Entry = { year: string; label: string; detail: string };

function Row({ item }: { item: Entry }) {
  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-6 border-t border-line py-6 sm:grid-cols-[9rem_1fr]">
      <span className="mono-meta pt-1 text-accent-strong">{item.year}</span>
      <div>
        <h3 className="display-sm">{item.label}</h3>
        {item.detail && <p className="mt-1.5 max-w-2xl text-body-sm text-pretty text-ink-muted">{item.detail}</p>}
      </div>
    </li>
  );
}

/** Newest first; older history is one click away so the page is not thirteen rows long. */
export default function Timeline({ items }: { items: Entry[] }) {
  const [open, setOpen] = useState(false);
  const { recent, older } = splitTimeline(items);
  return (
    <div className="flex flex-col">
      <ol className="flex flex-col border-b border-line">
        {recent.map((item, i) => <Row key={`${item.year}-${i}`} item={item} />)}
        {open && older.map((item, i) => <Row key={`older-${item.year}-${i}`} item={item} />)}
      </ol>
      {older.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-6 self-start border border-ink px-5 py-3 text-body-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:bg-ink hover:text-bg"
        >
          {open ? "Show less" : `Show full history (${older.length} more)`}
        </button>
      )}
    </div>
  );
}
