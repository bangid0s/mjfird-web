"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { RequestState } from "@/lib/client/request-actions";

function Buttons({ asking, onAsk }: { asking: boolean; onAsk: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2">
      {!asking && (
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="label inline-flex items-center justify-center bg-accent px-5 py-3 text-accent-ink transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Approve"}
        </button>
      )}
      {asking ? (
        <button
          type="submit"
          name="decision"
          value="changes"
          disabled={pending}
          className="label inline-flex items-center justify-center bg-ink px-5 py-3 text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send change request"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAsk}
          disabled={pending}
          className="label inline-flex items-center justify-center border border-line-strong px-5 py-3 text-ink transition-colors hover:bg-bg-raised disabled:opacity-60"
        >
          Ask for changes
        </button>
      )}
    </div>
  );
}

/** Approve the shared stage, or open a note and ask for changes. */
export default function StageReviewForm({
  stage,
  action,
}: {
  stage: string;
  action: (prev: RequestState, formData: FormData) => Promise<RequestState>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [asking, setAsking] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}
      {asking && (
        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium text-ink">What should change in the {stage.toLowerCase()}?</span>
          <textarea
            name="note"
            rows={4}
            required
            maxLength={2000}
            autoFocus
            placeholder="Be as specific as you can: colours, pose, details…"
            className="w-full resize-y border border-line bg-bg px-4 py-3 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>
      )}
      <Buttons asking={asking} onAsk={() => setAsking(true)} />
      {asking && (
        <button type="button" onClick={() => setAsking(false)} className="label self-start transition-colors hover:text-ink">
          Never mind, go back
        </button>
      )}
    </form>
  );
}
