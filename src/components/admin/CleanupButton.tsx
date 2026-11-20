"use client";

import { useFormStatus } from "react-dom";

/** Submit button for the reference cleanup form: asks first, then shows progress. */
export default function CleanupButton({ confirmText, children }: { confirmText: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      className="inline-flex items-center gap-2 border border-line-strong px-4 py-2 text-body-sm font-medium text-ink transition-colors hover:border-error hover:text-error disabled:opacity-60"
    >
      {pending ? "Cleaning up…" : children}
    </button>
  );
}
