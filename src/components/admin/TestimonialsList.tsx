"use client";

import Link from "next/link";
import { useTransition } from "react";
import { reorderTestimonials, deleteTestimonial, setTestimonialStatus } from "@/lib/admin/testimonials-actions";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import StatusBadge from "@/components/admin/StatusBadge";
import type { ContentStatus, TestimonialRow } from "@/lib/supabase/types";

function QuickStatus({ id, to, label }: { id: string; to: ContentStatus; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await setTestimonialStatus(id, to);
          } catch (err) {
            alert(err instanceof Error ? err.message : "Couldn't update. Please try again.");
          }
        })
      }
      className={
        to === "published"
          ? "border border-success/50 px-2.5 py-1 text-body-sm font-medium text-success hover:bg-success/10 disabled:opacity-50"
          : "text-body-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50"
      }
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function TestimonialsList({ testimonials }: { testimonials: TestimonialRow[] }) {
  return (
    <ReorderableList
      items={testimonials}
      onReorder={reorderTestimonials}
      renderRow={(t) => {
        const verified = t.request_id !== null;
        const awaiting = verified && t.public_consent && t.status === "draft";
        return (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-body text-body text-ink">{t.name}</span>
              {verified && t.rating ? (
                <span className="text-body-sm text-accent" aria-label={`${t.rating} out of 5 stars`}>
                  {"★".repeat(t.rating)}
                  <span className="text-line">{"★".repeat(5 - t.rating)}</span>
                </span>
              ) : null}
              <StatusBadge status={t.status} />
              {verified && (
                <span className="border border-line px-2 py-0.5 text-[11px] font-medium leading-4 text-ink-muted">
                  ✓ Verified{t.service_title ? ` · ${t.service_title}` : ""}
                </span>
              )}
              {awaiting && <span className="text-[11px] font-medium text-accent-strong">Awaiting your approval</span>}
              {verified && !t.public_consent && (
                <span className="text-[11px] font-medium text-ink-faint">Private: client didn&apos;t allow publishing</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {awaiting && <QuickStatus id={t.id} to="published" label="Approve" />}
              {verified && t.status === "published" && <QuickStatus id={t.id} to="draft" label="Unpublish" />}
              <Link href={`/admin/testimonials/${t.id}`} className="text-body-sm font-medium text-ink-muted hover:text-ink">
                {verified ? "Open" : "Edit"}
              </Link>
              <DeleteButton action={deleteTestimonial.bind(null, t.id)} />
            </div>
          </div>
        );
      }}
    />
  );
}
