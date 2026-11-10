"use client";

import { useState } from "react";

const LONG = 220;

/** Four lines, with the rest one click away, so six long quotes stop being a wall. */
export default function ClampedQuote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG;
  return (
    <>
      <span className={`whitespace-pre-line ${long && !open ? "line-clamp-4" : ""}`}>{text}</span>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-start text-body-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}
