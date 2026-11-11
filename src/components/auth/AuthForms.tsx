"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  updatePassword,
  type AuthState,
} from "@/lib/client/auth-actions";
import { cn } from "@/lib/cn";

export const authInput =
  "w-full border border-line bg-bg-raised px-4 py-3.5 text-body text-ink transition-colors duration-[var(--duration-fast)] placeholder:text-ink-faint focus:border-ink focus:outline-none disabled:opacity-50";

export function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="eyebrow">{text}</span>
      {children}
    </label>
  );
}

export function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="spec w-full bg-accent px-6 py-4 text-accent-ink transition-[filter] hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "One moment…" : children}
    </button>
  );
}

export function Notice({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="border border-error/40 px-4 py-3 text-body-sm text-error">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="border border-accent/40 px-4 py-3 text-body-sm text-ink">
        {state.message}
      </p>
    );
  return null;
}

function PasswordInput({ autoComplete }: { autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name="password"
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        className={cn(authInput, "pr-16")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="spec absolute inset-y-0 right-0 px-4 text-ink-faint hover:text-ink"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function GoogleButton({ next, label }: { next: string; label: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <GoogleSubmit label={label} />
    </form>
  );
}

function GoogleSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 border border-line-strong bg-bg px-6 py-3.5 text-body text-ink transition-colors hover:border-ink disabled:opacity-60"
    >
      <GoogleIcon />
      {pending ? "Opening Google…" : label}
    </button>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-line" />
      <span className="mono-meta">or with email</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function SignInForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action] = useActionState(signInWithEmail, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Notice state={state} />
      <Label text="Email">
        <input name="email" type="email" required autoComplete="email" className={authInput} />
      </Label>
      <Label text="Password">
        <PasswordInput autoComplete="current-password" />
      </Label>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-body-sm text-ink-muted underline-offset-4 hover:text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <Submit>Sign in</Submit>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUpWithEmail, undefined);
  if (state?.message) return <Notice state={state} />;
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Notice state={state} />
      <Label text="Name">
        <input name="name" required autoComplete="name" className={authInput} />
      </Label>
      <Label text="Email">
        <input name="email" type="email" required autoComplete="email" className={authInput} />
      </Label>
      <Label text="Password — 8+ characters">
        <PasswordInput autoComplete="new-password" />
      </Label>
      <Submit>Create account</Submit>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Notice state={state} />
      <Label text="Email">
        <input name="email" type="email" required autoComplete="email" className={authInput} />
      </Label>
      <Submit>Send reset link</Submit>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Notice state={state} />
      <Label text="New password — 8+ characters">
        <PasswordInput autoComplete="new-password" />
      </Label>
      <Submit>Save password</Submit>
    </form>
  );
}
