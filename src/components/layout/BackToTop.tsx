"use client";

import { scrollToTop } from "@/components/motion/SmoothScroll";

export default function BackToTop() {
  return (
    <button
      type="button"
      data-cursor="view"
      onClick={scrollToTop}
      className="spec group inline-flex items-center gap-2 transition-colors duration-[var(--duration-fast)] hover:text-ink"
    >
      Back to top
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center border border-line transition-[transform,border-color,background-color] duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:-translate-y-0.5 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink"
      >
        ↑
      </span>
    </button>
  );
}
