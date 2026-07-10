"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

export default function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 px-6 py-3 font-mono text-label uppercase tracking-[0.15em] transition-opacity disabled:opacity-60",
        variant === "primary"
          ? "bg-accent text-accent-ink"
          : "text-ink-muted hover:text-ink",
        className,
      )}
    >
      {pending && (
        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
