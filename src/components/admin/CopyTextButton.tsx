"use client";

import { useState } from "react";

/** Copies a block of text (e.g. every waitlist email) for pasting into a mail BCC. */
export default function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="text-body-sm font-medium text-ink-muted transition-colors hover:text-ink"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
