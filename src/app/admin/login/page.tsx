"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/admin/auth-actions";

const inputClasses =
  "w-full rounded-[var(--radius-md)] border border-line bg-bg px-4 py-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <form action={formAction} className="surface flex w-full max-w-sm flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow eyebrow-accent">MJFIRD</p>
          <h1 className="display-sm">Admin sign in</h1>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-body-sm font-medium text-ink">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-body-sm font-medium text-ink">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className={inputClasses}
          />
        </label>

        {state?.error && (
          <p className="rounded-[var(--radius-md)] border border-error/40 bg-error/10 px-4 py-3 text-body-sm text-error">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-6 py-3 text-body-sm font-medium text-accent-ink shadow-sm transition-[opacity,box-shadow,filter] duration-[var(--duration-fast)] hover:shadow-md hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
