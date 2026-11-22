"use client";

import { useActionState } from "react";
import { joinSlotWaitlist, type WaitlistState } from "@/lib/client/waitlist-actions";
import { trackEvent } from "@/lib/track";
import { fieldInputClasses } from "@/components/admin/Field";

/** "Notify me when a slot opens" — one email field, shown while every slot is taken. */
export default function NotifyForm({ service }: { service?: string }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(async (prev, formData) => {
    const result = await joinSlotWaitlist(prev, formData);
    if (result?.done) trackEvent("join_waitlist", { service: service ?? "any" });
    return result;
  }, undefined);

  if (state?.done) {
    return (
      <p role="status" className="border border-line px-4 py-3 text-body-sm text-ink">
        You&apos;re on the list. I&apos;ll email you as soon as a slot opens.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <label htmlFor={`notify-${service ?? "any"}`} className="text-body-sm text-ink-muted">
        All slots are taken right now. Leave your email and I&apos;ll tell you as soon as one opens.
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`notify-${service ?? "any"}`}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={`${fieldInputClasses} min-w-0 flex-1`}
        />
        {service && <input type="hidden" name="service" value={service} />}
        {/* Bots fill every field; people never see this one. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button
          type="submit"
          disabled={pending}
          className="bg-accent px-5 py-2.5 text-body-sm font-medium text-accent-ink transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Notify me"}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}
      <p className="text-[12px] text-ink-faint">One email when a slot opens. No newsletter.</p>
    </form>
  );
}
