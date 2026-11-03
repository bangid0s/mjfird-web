"use client";

/**
 * Opens the browser's print dialog — which is also its "Save as PDF" — for a
 * page whose print styles strip the window chrome down to the document.
 */
export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hidden h-8 items-center gap-2 border border-line-strong px-3 font-mono text-label uppercase tracking-[0.12em] text-ink transition-colors duration-[var(--duration-fast)] hover:border-ink sm:inline-flex"
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
        <path d="M7 9V4h10v5M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2" />
        <path d="M7 14h10v6H7z" />
      </svg>
      {label}
    </button>
  );
}
