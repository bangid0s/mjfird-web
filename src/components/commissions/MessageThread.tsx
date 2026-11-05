"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { CommissionMessageRow } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";

type State = { error?: string } | undefined;

function Send() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="spec self-end bg-accent px-5 py-3 text-accent-ink hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export default function MessageThread({
  messages,
  action,
  viewer,
  artistName = "MJFIRD",
  clientName,
}: {
  messages: CommissionMessageRow[];
  action: (prev: State, formData: FormData) => Promise<State>;
  viewer: "client" | "admin";
  artistName?: string;
  clientName: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div className="flex flex-col gap-5">
      {messages.length === 0 ? (
        <p className="text-body-sm text-ink-faint">No messages yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => {
            const mine = (viewer === "admin") === m.from_admin;
            return (
              <li key={m.id} className={cn("flex flex-col gap-1.5", mine ? "items-end" : "items-start")}>
                <span className="mono-meta">
                  {m.from_admin ? artistName : clientName} ·{" "}
                  {new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                <p
                  className={cn(
                    "max-w-[34rem] whitespace-pre-line border px-4 py-3 text-body-sm text-pretty",
                    mine ? "border-accent/40 bg-bg-raised text-ink" : "border-line bg-bg text-ink",
                  )}
                >
                  {m.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        {state?.error && <p className="text-body-sm text-error">{state.error}</p>}
        <textarea
          name="body"
          rows={3}
          required
          maxLength={5000}
          placeholder={viewer === "admin" ? "Reply to the client…" : "Ask a question or add details…"}
          className="w-full resize-y border border-line bg-bg-raised px-4 py-3 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
        <Send />
      </form>
    </div>
  );
}
