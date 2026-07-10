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

  return (
    <div>
      <PageHeader
        title="Testimonials"
        description="Client quotes shown on the homepage. Drag to reorder."
        action={<HeaderAction href="/admin/testimonials/new">New testimonial</HeaderAction>}
      />

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
