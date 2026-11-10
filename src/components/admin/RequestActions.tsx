"use client";

import { useState, useTransition } from "react";
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
  setPaymentUrl,
} from "@/lib/admin/requests-actions";
import type { CommissionStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";

const primary =
  "inline-flex items-center justify-center bg-accent px-4 py-2.5 text-body-sm font-medium text-accent-ink transition-[filter] hover:brightness-110 disabled:opacity-50";
const ghost =
  "inline-flex items-center justify-center border border-line px-4 py-2.5 text-body-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50";

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  return { pending, error, run };
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
}: {
  id: string;
  status: CommissionStatus;
  estimate: number;
  note: string;
  paymentUrl: string | null;
}) {
  const { pending, error, run } = useRun();
  const [mode, setMode] = useState<"accept" | "decline" | null>(null);

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-4">
        {error && <p className="text-body-sm text-error">{error}</p>}
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
              <span className="text-[13px] font-medium text-ink-muted">Final price (USD) — adjust if the brief needs more</span>
              <input name="final_price" type="number" min={0} step="0.01" defaultValue={estimate} className={fieldInputClasses} />
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
      {error && <p className="text-body-sm text-error">{error}</p>}
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
}: {
  id: string;
  clientId: string;
  files: { path: string; name: string; url: string }[];
}) {
  const { pending, error, run } = useRun();
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
      {error && <p className="text-body-sm text-error">{error}</p>}
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
    </div>
  );
}
