"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { authInput } from "@/components/auth/AuthForms";
import Stars from "@/components/reviews/Stars";
import type { RequestState } from "@/lib/client/request-actions";
import type { TestimonialRow } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";

type Review = Pick<TestimonialRow, "quote" | "name" | "role" | "rating" | "public_consent" | "status">;

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="spec self-start bg-accent px-6 py-3.5 text-accent-ink hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Sending…" : editing ? "Update review" : "Send review"}
    </button>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mono-meta mb-2">Your rating</legend>
      <div className="flex items-center gap-3" onMouseLeave={() => setHover(0)}>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name="rating"
                value={n}
                required
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "block text-[28px] leading-none transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                  n <= shown ? "text-accent" : "text-line",
                )}
              >
                ★
              </span>
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
            </label>
          ))}
        </div>
        <span className="text-body-sm text-ink-muted">{RATING_WORDS[shown]}</span>
      </div>
    </fieldset>
  );
}

export default function ReviewForm({
  action,
  existing,
  defaultName,
}: {
  action: (prev: RequestState, formData: FormData) => Promise<RequestState>;
  existing: Review | null;
  defaultName: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [editing, setEditing] = useState(false);
  // Close the form once a save succeeds (the page re-renders with the saved review).
  const [seen, setSeen] = useState<RequestState>(undefined);
  if (state !== seen) {
    setSeen(state);
    if (state?.done) setEditing(false);
  }

  if (existing && !editing) {
    const status =
      !existing.public_consent
        ? "Private feedback, only visible to MJFIRD."
        : existing.status === "published"
          ? "Published on the site. Thank you!"
          : "Waiting for approval before it appears on the site.";
    return (
      <div className="flex flex-col gap-4">
        {state?.done && (
          <p role="status" className="border border-accent/40 bg-bg-raised px-4 py-3 text-body-sm text-ink">
            Thanks for your review!
          </p>
        )}
        <figure className="flex flex-col gap-3 border-l-2 border-accent pl-5">
          {existing.rating ? <Stars rating={existing.rating} /> : null}
          <blockquote className="whitespace-pre-line text-body text-pretty text-ink">{existing.quote}</blockquote>
          <figcaption className="spec text-ink-muted">
            {existing.name}
            {existing.role ? ` — ${existing.role}` : ""}
          </figcaption>
        </figure>
        <p className="text-body-sm text-ink-muted">{status}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="spec self-start text-ink-faint underline-offset-4 hover:text-accent hover:underline"
        >
          Edit review
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <p className="text-body-sm text-pretty text-ink-muted">
        How was working together? Your review helps future clients feel confident ordering.
        {existing && " Editing sends it back for approval."}
      </p>

      <StarPicker value={rating} onChange={setRating} />

      <label className="flex flex-col gap-2">
        <span className="mono-meta">Your review</span>
        <textarea
          name="quote"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          defaultValue={existing?.quote ?? ""}
          placeholder="What stood out: communication, timing, the final result…"
          className={cn(authInput, "resize-y")}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="mono-meta">Name to show</span>
          <input name="name" required maxLength={80} defaultValue={existing?.name ?? defaultName} className={authInput} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="mono-meta">Role or company (optional)</span>
          <input
            name="role"
            maxLength={80}
            defaultValue={existing?.role ?? ""}
            placeholder="e.g. Art Director, Studio K"
            className={authInput}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mono-meta mb-1">Can this be shown on mjfird.com?</legend>
        <label className="flex items-start gap-2.5 text-body-sm text-ink">
          <input
            type="radio"
            name="visibility"
            value="public"
            required
            defaultChecked={existing ? existing.public_consent : undefined}
            className="mt-1 accent-[var(--color-accent)]"
          />
          Yes, show it publicly with the name above (after MJFIRD approves it)
        </label>
        <label className="flex items-start gap-2.5 text-body-sm text-ink">
          <input
            type="radio"
            name="visibility"
            value="private"
            defaultChecked={existing ? !existing.public_consent : undefined}
            className="mt-1 accent-[var(--color-accent)]"
          />
          No, keep it private feedback for MJFIRD only
        </label>
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-5">
        <Submit editing={!!existing} />
        {existing && (
          <button type="button" onClick={() => setEditing(false)} className="spec text-ink-faint hover:text-ink">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
