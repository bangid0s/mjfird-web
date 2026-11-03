"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/admin/AdminIcons";

export default function SubmitButton({
  children,
  pendingLabel = "Saving…",
  savedLabel = "Saved",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  savedLabel?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  // A save that stays on the page used to finish silently. Flash a
  // confirmation for a moment when a submission settles.
  useEffect(() => {
    if (wasPending.current && !pending) {
      setSaved(true);
      const id = setTimeout(() => setSaved(false), 2200);
      wasPending.current = false;
      return () => clearTimeout(id);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-body-sm font-medium transition-[filter,opacity,transform,background-color] duration-[var(--duration-fast)] active:translate-y-px disabled:cursor-wait disabled:opacity-70",
        variant === "primary"
          ? saved
            ? "bg-success text-white"
            : "bg-accent text-accent-ink hover:brightness-110"
          : "border border-line text-ink-muted hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      {pending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : saved ? (
        <CheckIcon className="h-4 w-4" />
      ) : null}
      {pending ? pendingLabel : saved ? savedLabel : children}
    </button>
  );
}

/**
 * The save row at the bottom of a long form, pinned to the viewport so the
 * button is always one click away instead of a scroll to the end.
 */
export function FormActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-[var(--z-content)] -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
