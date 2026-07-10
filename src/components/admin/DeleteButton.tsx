"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";

export default function DeleteButton({ action }: { action: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint hover:text-error"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(action)}
        className={cn(
          "font-mono text-label uppercase tracking-[0.1em] text-error",
          pending && "opacity-50",
        )}
      >
        {pending ? "Deleting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint"
      >
        Cancel
      </button>
    </span>
  );
}
