"use client";

import { useState } from "react";

/**
 * The studio intro. On a phone it is held to two lines so the links stay on
 * the first screen, with the rest one tap away; from tablet up it runs in full.
 */
export default function IntroText({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);
  if (lines.length === 0) return null;
  const long = lines.join(" ").length > 90;
  const clamped = long && !open;

  return (
    <div className="flex max-w-xl flex-col items-start gap-1">
      {clamped && <p className="line-clamp-2 text-body-sm text-ink-muted sm:hidden">{lines.join(" ")}</p>}
      <div className={clamped ? "hidden flex-col gap-0.5 sm:flex" : "flex flex-col gap-0.5"}>
        {lines.map((line, i) => (
          <p key={i} className="text-body-sm text-ink-muted sm:text-body">
            {line}
          </p>
        ))}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="-my-1.5 py-1.5 text-body-sm font-medium text-ink underline decoration-line-strong underline-offset-4 sm:hidden"
        >
          {open ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
