import { createClient } from "@/lib/supabase/server";
import TestimonialsList from "@/components/admin/TestimonialsList";
import PageHeader, { HeaderAction } from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import type { TestimonialRow } from "@/lib/supabase/types";

export default async function AdminTestimonialsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });

  const testimonials = (data as TestimonialRow[]) ?? [];
  const awaiting = testimonials.filter((t) => t.request_id && t.public_consent && t.status === "draft").length;

  return (
    <div>
      <PageHeader
        title="Testimonials"
        description="Client quotes shown on the homepage. Verified reviews come from clients after a completed commission and also show on their service page. Drag to reorder."
        action={<HeaderAction href="/admin/testimonials/new">New testimonial</HeaderAction>}
      />

      {awaiting > 0 && (
        <p role="status" className="mb-6 border border-accent/40 bg-bg-raised px-4 py-3 text-body-sm text-ink">
          {awaiting} verified review{awaiting === 1 ? " is" : "s are"} waiting for your approval. Nothing is public until you approve.
        </p>
      )}

      {testimonials.length === 0 ? (
        <EmptyState
          title="No testimonials yet"
          description="Social proof sells — add a quote from a past client or collaborator."
          ctaHref="/admin/testimonials/new"
          ctaLabel="Add a testimonial"
        />
      ) : (
        <TestimonialsList testimonials={testimonials} />
      )}
    </div>
  );
}
