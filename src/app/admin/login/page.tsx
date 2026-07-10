"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/admin/auth-actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="font-display text-display-sm uppercase text-ink">Admin sign in</h1>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full border-b border-line bg-transparent py-3 font-body text-body text-ink focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full border-b border-line bg-transparent py-3 font-body text-body text-ink focus:border-accent focus:outline-none"
          />
        </label>

        {state?.error && <p className="font-mono text-label text-error">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="bg-accent px-6 py-3 font-mono text-label uppercase tracking-[0.15em] text-accent-ink transition-opacity disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
