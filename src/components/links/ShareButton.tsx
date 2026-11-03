"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A link-in-bio page gets passed around; this saves the visitor a trip to
 * the address bar. Native share sheet where there is one, clipboard otherwise.
 */
export default function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Dismissed share sheet or blocked clipboard: nothing to report.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : "Share this page"}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 font-mono text-[11px] text-ink-muted transition-colors duration-[var(--duration-fast)] hover:border-line-strong hover:text-ink",
        copied && "border-success text-success",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
        {copied ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />}
      </svg>
      <span aria-live="polite">{copied ? "Copied" : "Share"}</span>
    </button>
  );
}
