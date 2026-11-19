"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteTestimonial, setFeaturedTestimonial, setTestimonialStatus } from "@/lib/admin/testimonials-actions";
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

function PinToggle({ id, featured }: { id: string; featured: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={featured}
      title={featured ? "Stop leading the home page with this review" : "Lead the home page with this review"}
      onClick={() =>
        start(async () => {
          try {
            await setFeaturedTestimonial(id, !featured);
          } catch (err) {
            alert(err instanceof Error ? err.message : "Couldn't update. Please try again.");
          }
        })
      }
      className={
        featured
          ? "border border-accent/60 px-2.5 py-1 text-body-sm font-medium text-accent-strong hover:bg-accent/10 disabled:opacity-50"
          : "text-body-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50"
      }
    >
      {pending ? "Saving…" : featured ? "Pinned" : "Pin"}
    </button>
  );
}

const DATE = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Newest first, the same order the public site uses. */
export default function TestimonialsList({ testimonials }: { testimonials: TestimonialRow[] }) {
  return (
    <ul className="flex flex-col border border-line bg-bg-raised/30">
      {testimonials.map((t) => {
        const posted = t.submitted_at || t.created_at;
        const verified = t.request_id !== null;
        const awaiting = verified && t.public_consent && t.status === "draft";
        return (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-4 py-3 transition-colors first:border-t-0 hover:bg-bg-raised"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-body text-body text-ink">{t.name}</span>
              {verified && t.rating ? (
                <span className="text-body-sm text-accent" aria-label={`${t.rating} out of 5 stars`}>
                  {"★".repeat(t.rating)}
                  <span className="text-line">{"★".repeat(5 - t.rating)}</span>
                </span>
              ) : null}
              <StatusBadge status={t.status} />
              {posted && <span className="text-[11px] text-ink-faint">{DATE.format(Date.parse(posted))}</span>}
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
              {t.status === "published" && <PinToggle id={t.id} featured={t.featured === true} />}
              {awaiting && <QuickStatus id={t.id} to="published" label="Approve" />}
              {verified && t.status === "published" && <QuickStatus id={t.id} to="draft" label="Unpublish" />}
              <Link href={`/admin/testimonials/${t.id}`} className="text-body-sm font-medium text-ink-muted hover:text-ink">
                {verified ? "Open" : "Edit"}
              </Link>
              <DeleteButton action={deleteTestimonial.bind(null, t.id)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
