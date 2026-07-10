"use client";

import Link from "next/link";
import { reorderTestimonials, deleteTestimonial } from "@/lib/admin/testimonials-actions";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import StatusBadge from "@/components/admin/StatusBadge";
import type { TestimonialRow } from "@/lib/supabase/types";

export default function TestimonialsList({ testimonials }: { testimonials: TestimonialRow[] }) {
  return (
    <ReorderableList
      items={testimonials}
      onReorder={reorderTestimonials}
      renderRow={(t) => (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-body text-body text-ink">{t.name}</span>
            <StatusBadge status={t.status} />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/testimonials/${t.id}`}
              className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
            >
              Edit
            </Link>
            <DeleteButton action={deleteTestimonial.bind(null, t.id)} />
          </div>
        </div>
      )}
    />
  );
}
