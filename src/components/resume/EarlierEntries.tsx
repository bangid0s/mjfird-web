"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * The older half of a resume section. It always shows — one compact line per
 * role — and the button swaps those lines for the full entries. Both versions
 * are rendered by the server and passed in, so this only holds the switch.
 *
 * Paper gets the compact lines regardless of the switch: a printed resume
 * should spend its second page on recent work, not on 2013.
 */
export default function EarlierEntries({
  label,
  count,
  compact,
  full,
  expandable,
}: {
  label: string;
  count: number;
  compact: ReactNode;
  full: ReactNode;
  /** False when the older entries carry nothing beyond what a line shows. */
  expandable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="mt-2 border-t border-line pt-5 print:mt-0 print:pt-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-body-sm font-medium text-ink">
          {label} <span className="font-normal text-ink-faint">({count})</span>
        </h3>
        {expandable && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-2 border border-line-strong px-3 text-body-sm text-ink transition-colors duration-[var(--duration-fast)] hover:border-ink print:hidden"
          >
            {open ? "Hide details" : "Show details"}
            <span aria-hidden="true" className="font-mono text-ink-faint">
              {open ? "−" : "+"}
            </span>
          </button>
        )}
      </div>
      <div id={id}>
        <div className={open ? "hidden print:block" : undefined}>{compact}</div>
        {open && <div className="print:hidden">{full}</div>}
      </div>
    </div>
  );
}
