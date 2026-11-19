"use client";

import { useEffect, useState, useTransition } from "react";
import { fieldInputClasses } from "@/components/admin/Field";
import { createClient } from "@/lib/supabase/client";
import {
  acceptRequest,
  addDeliveryFiles,
  advanceRequest,
  cancelRequestAsAdmin,
  declineRequest,
  removeDeliveryFile,
  saveArtistNote,
  setDeliveryUrl,
  setPaymentUrl,
  setWorkStage,
} from "@/lib/admin/requests-actions";
import type { CommissionStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";

const primary =
  "inline-flex items-center justify-center bg-accent px-4 py-2.5 text-body-sm font-medium text-accent-ink transition-[filter] hover:brightness-110 disabled:opacity-50";
const ghost =
  "inline-flex items-center justify-center border border-line px-4 py-2.5 text-body-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50";

type Result = { error?: string } | undefined | void;

/*
  Runs a request action and reports how it went. Actions return { error }
  rather than throwing, because production builds replace thrown messages
  with a generic one. A short "Saved" confirms the change landed, so a quiet
  screen never leaves you wondering whether the click did anything.
*/
function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      setError(null);
      setSaved(false);
      try {
        const result = await fn();
        if (result?.error) setError(result.error);
        else setSaved(true);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  return { pending, error, saved, run };
}

function Feedback({ error, saved }: { error: string | null; saved: boolean }) {
  return (
    <p aria-live="polite" className={cn("text-body-sm", error ? "text-error" : "text-success", !error && !saved && "sr-only")}>
      {error ?? (saved ? "Saved." : "")}
    </p>
  );
}

const ADVANCE_LABEL: Partial<Record<CommissionStatus, string>> = {
  awaiting_payment: "Mark paid & start work",
  in_progress: "Mark delivered",
  delivered: "Mark completed",
};

export function StatusActions({
  id,
  status,
  estimate,
  note,
  paymentUrl,
  discountNote = null,
  quote = false,
}: {
  id: string;
  status: CommissionStatus;
  estimate: number;
  /** A custom quote: no estimate, so the price must be entered to accept. */
  quote?: boolean;
  note: string;
  paymentUrl: string | null;
  /** Shown under the price when the estimate already includes a past-client discount. */
  discountNote?: string | null;
}) {
  const { pending, error, saved, run } = useRun();
  const [mode, setMode] = useState<"accept" | "decline" | null>(null);

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-4">
        <Feedback error={error} saved={saved} />
        {mode === null && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primary} onClick={() => setMode("accept")}>
              Accept…
            </button>
            <button type="button" className={ghost} onClick={() => setMode("decline")}>
              Decline…
            </button>
          </div>
        )}
        {mode === "accept" && (
          <form
            className="flex flex-col gap-3"
            action={(fd) => run(() => acceptRequest(id, fd))}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-muted">
                {quote ? "Your quote (USD) — the client sees this price" : "Final price (USD) — adjust if the brief needs more"}
              </span>
              {quote ? (
                <input name="final_price" type="number" min={0.01} step="0.01" required placeholder="e.g. 250" className={fieldInputClasses} />
              ) : (
                <input name="final_price" type="number" min={0} step="0.01" defaultValue={estimate} className={fieldInputClasses} />
              )}
              {discountNote && <span className="text-[13px] text-accent">{discountNote}</span>}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-muted">PayPal payment link (optional)</span>
              <input
                name="payment_url"
                maxLength={2000}
                spellCheck={false}
                autoComplete="off"
                placeholder="https://www.paypal.com/… or https://paypal.me/…"
                className={fieldInputClasses}
              />
            </label>
            <p className="text-[13px] text-ink-faint">Leave this blank to accept now and paste the invoice link afterward.</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-muted">Note to client (optional)</span>
              <textarea name="artist_note" rows={3} defaultValue={note} className={cn(fieldInputClasses, "resize-y")} />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={primary}>
                {pending ? "Accepting…" : "Accept & email client"}
              </button>
              <button type="button" className={ghost} onClick={() => setMode(null)}>
                Back
              </button>
            </div>
          </form>
        )}
        {mode === "decline" && (
          <form className="flex flex-col gap-3" action={(fd) => run(() => declineRequest(id, fd))}>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-muted">Reason (shown to the client, optional)</span>
              <textarea name="artist_note" rows={3} className={cn(fieldInputClasses, "resize-y")} />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={cn(primary, "bg-ink text-bg")}>
                {pending ? "Declining…" : "Decline & email client"}
              </button>
              <button type="button" className={ghost} onClick={() => setMode(null)}>
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const label = ADVANCE_LABEL[status];
  const closed = status === "completed" || status === "declined" || status === "cancelled";

  return (
    <div className="flex flex-col gap-4">
      <Feedback error={error} saved={saved} />
      {status === "awaiting_payment" && (
        <form className="flex flex-col gap-3" action={(fd) => run(() => setPaymentUrl(id, fd))}>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-muted">PayPal payment link</span>
            <input
              name="payment_url"
              maxLength={2000}
              spellCheck={false}
              autoComplete="off"
              defaultValue={paymentUrl ?? ""}
              placeholder="https://www.paypal.com/… or https://paypal.me/…"
              className={fieldInputClasses}
            />
          </label>
          <p className="text-[13px] text-ink-faint">
            Invoice, PayPal.me, or payment link. The client pays from their request page. Clear the field and save to remove it.
          </p>
          <button type="submit" disabled={pending} className={cn(ghost, "self-start")}>
            {pending ? "Saving…" : "Save payment link"}
          </button>
        </form>
      )}
      {status === "awaiting_payment" && (
        <p className="text-[13px] text-ink-faint">Mark it paid once the payment arrives. That starts the work.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {label && (
          <button type="button" disabled={pending} className={primary} onClick={() => run(() => advanceRequest(id))}>
            {pending ? "Saving…" : label}
          </button>
        )}
        {!closed && (
          <button
            type="button"
            disabled={pending}
            className={ghost}
            onClick={() => confirm("Cancel this request?") && run(() => cancelRequestAsAdmin(id))}
          >
            Cancel request
          </button>
        )}
      </div>
      <form className="flex flex-col gap-2" action={(fd) => run(() => saveArtistNote(id, fd))}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-muted">Note shown to client</span>
          <textarea name="artist_note" rows={2} defaultValue={note} className={cn(fieldInputClasses, "resize-y")} />
        </label>
        <button type="submit" disabled={pending} className={cn(ghost, "self-start")}>
          Save note
        </button>
      </form>
    </div>
  );
}

export function DeliveryUploader({
  id,
  clientId,
  files,
  deliveryUrl,
}: {
  id: string;
  clientId: string;
  files: { path: string; name: string; url: string }[];
  deliveryUrl: string | null;
}) {
  const { pending, error, saved, run } = useRun();
  const [busy, setBusy] = useState(false);

  const upload = async (list: FileList) => {
    setBusy(true);
    const supabase = createClient();
    const paths: string[] = [];
    for (const file of Array.from(list)) {
      const clean = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
      const path = `${clientId}/deliveries/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${clean}`;
      const { error: err } = await supabase.storage.from("commissions").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (!err) paths.push(path);
    }
    setBusy(false);
    if (paths.length) run(() => addDeliveryFiles(id, paths));
  };

  return (
    <div className="flex flex-col gap-3">
      <Feedback error={error} saved={saved} />
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-3 border border-line bg-bg px-3 py-2 text-body-sm">
              <a href={f.url} target="_blank" rel="noreferrer" className="truncate text-ink hover:text-accent">
                {f.name}
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => confirm("Remove this file?") && run(() => removeDeliveryFile(id, f.path))}
                className="text-[13px] text-ink-faint hover:text-error"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className={cn(ghost, "cursor-pointer self-start", (busy || pending) && "opacity-50")}>
        {busy ? "Uploading…" : "Upload final files"}
        <input
          type="file"
          multiple
          className="sr-only"
          disabled={busy || pending}
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-[13px] text-ink-faint">Only this client can download these (private links, valid for an hour at a time).</p>

      <form
        key={deliveryUrl ?? ""}
        className="flex flex-col gap-2 border-t border-line pt-4"
        action={(fd) => run(() => setDeliveryUrl(id, fd))}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-muted">Drop link for final files</span>
          <input
            name="delivery_url"
            type="url"
            inputMode="url"
            maxLength={2000}
            spellCheck={false}
            autoComplete="off"
            defaultValue={deliveryUrl ?? ""}
            placeholder="https://drive.google.com/… or https://www.dropbox.com/…"
            className={fieldInputClasses}
          />
        </label>
        <p className="text-[13px] text-ink-faint">
          For big or many files: Google Drive, Dropbox, WeTransfer. The client gets an &ldquo;Open files&rdquo; button. Make sure the folder&apos;s sharing lets them in. Clear the field and save to remove it.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={ghost}>
            {pending ? "Saving…" : "Save link"}
          </button>
          {deliveryUrl && (
            <a href={deliveryUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-ink-muted hover:text-accent">
              Test link ↗
            </a>
          )}
        </div>
      </form>
    </div>
  );
}

/*
  Where the order is, as one tap per stage. Previews and feedback live in the
  client's Discord ticket; this only moves the marker the client sees. Moving
  forward sends the client a notification; tapping an earlier stage steps back.
*/
export function WorkStagesAdmin({ id, stages, index }: { id: string; stages: string[]; index: number }) {
  const { pending, error, saved, run } = useRun();
  const next = stages[index + 1];

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-1.5" aria-label="Set the current stage">
        {stages.map((name, i) => {
          const current = i === index;
          return (
            <li key={`${i}-${name}`} className="min-w-[6.5rem] flex-1">
              <button
                type="button"
                disabled={pending || current}
                aria-current={current ? "step" : undefined}
                onClick={() => run(() => setWorkStage(id, i))}
                className={cn(
                  "flex w-full flex-col gap-0.5 border px-3 py-2 text-left transition-colors disabled:cursor-default",
                  i < index && "border-transparent bg-[color-mix(in_oklab,var(--color-status-progress)_10%,transparent)] hover:border-line-strong",
                  current && "border-2 border-[var(--color-status-progress)] bg-bg",
                  i > index && "border-dashed border-line hover:border-line-strong hover:bg-bg",
                )}
              >
                <span className={cn("text-body-sm font-medium", i > index ? "text-ink-muted" : "text-ink")}>{name}</span>
                <span className={cn("text-[12px]", current ? "font-medium text-[var(--color-status-progress)]" : "text-ink-faint")}>
                  {i < index ? "Done" : current ? "Now" : `Step ${i + 1}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        {next ? (
          <button type="button" disabled={pending} onClick={() => run(() => setWorkStage(id, index + 1))} className={primary}>
            {pending ? "Saving…" : `Move to ${next}`}
          </button>
        ) : (
          <p className="text-[13px] text-ink-faint">Last stage. Upload the final files and mark it delivered.</p>
        )}
        <Feedback error={error} saved={saved} />
      </div>
      <p className="text-[13px] text-ink-faint">
        The client sees this on their request page and gets a notification when you move forward. Tap an earlier stage to step back.
      </p>
    </div>
  );
}
