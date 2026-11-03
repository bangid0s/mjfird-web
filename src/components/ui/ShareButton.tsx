"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Hands the current page on: the native share sheet where there is one (phones,
 * which is where a links page gets opened), otherwise a copy to the clipboard
 * with a short confirmation in place of the label.
 */
export default function ShareButton({
  title,
  className,
  label = "Share",
}: {
  title: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = async () => {
    const url = window.location.href;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // The visitor closing the sheet is an answer, not a failure.
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // No clipboard permission — nothing useful left to do silently.
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center justify-center gap-2 border border-line-strong px-4 font-mono text-label uppercase tracking-[0.12em] text-ink transition-colors duration-[var(--duration-fast)] hover:border-ink",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-4 w-4"
      >
        {copied ? (
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <>
            <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
            <path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" />
          </>
        )}
      </svg>
      <span aria-live="polite">{copied ? "Link copied" : label}</span>
    </button>
  );
}
