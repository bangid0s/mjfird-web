"use client";

import { useTransition } from "react";
import { cancelRequest } from "@/lib/client/request-actions";

export default function CancelRequestButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this request? This can't be undone.")) return;
        start(async () => {
          try {
            await cancelRequest(requestId);
          } catch (err) {
            alert(err instanceof Error ? err.message : "Couldn't cancel. Please try again.");
          }
        });
      }}
      className="spec self-start text-ink-faint underline-offset-4 hover:text-error hover:underline disabled:opacity-50"
    >
      {pending ? "Cancelling…" : "Cancel request"}
    </button>
  );
}
