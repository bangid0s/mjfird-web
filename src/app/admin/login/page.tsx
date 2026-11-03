"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/admin/auth-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import { cn } from "@/lib/cn";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side — the flipped sheet, so the admin opens on the studio, not a form. */}
      <div className="tone-invert relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center bg-accent font-display text-base font-semibold text-accent-ink">
            M
          </span>
          <span className="spec">Studio admin</span>
        </div>
        <div>
          <p className="display-xl">MJFIRD</p>
          <p className="mt-6 max-w-sm text-body-lg text-ink-muted">
            Projects, inquiries and every page of the site — in one place.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="spec">Breaker — Designer — Builder</span>
          <span aria-hidden="true" className="h-16 w-16 bg-accent" />
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="mb-4 grid h-10 w-10 place-items-center bg-accent font-display text-base font-semibold text-accent-ink lg:hidden">
              M
            </span>
            <h1 className="display-md">Welcome back</h1>
            <p className="text-body text-ink-muted">Sign in to manage the site.</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-body-sm font-medium text-ink">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="you@mjfird.com"
              className={fieldInputClasses}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-body-sm font-medium text-ink">Password</span>
            <span className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                className={cn(fieldInputClasses, "pr-16")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 px-3.5 text-[12px] font-medium text-ink-muted hover:text-ink"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          {state?.error && (
            <p role="alert" className="border border-error/40 bg-error/10 px-4 py-3 text-body-sm text-error">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 bg-accent px-6 py-3 text-body-sm font-medium text-accent-ink transition-[filter,opacity] duration-[var(--duration-fast)] hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
          >
            {pending && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <Link href="/" className="text-center text-body-sm text-ink-faint hover:text-ink">
            ← Back to the site
          </Link>
        </form>
      </div>
    </div>
  );
}
