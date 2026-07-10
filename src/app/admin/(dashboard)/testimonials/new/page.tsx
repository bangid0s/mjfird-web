import TestimonialForm from "@/components/admin/TestimonialForm";
import { createTestimonial } from "@/lib/admin/testimonials-actions";
import PageHeader from "@/components/admin/PageHeader";

export default function NewTestimonialPage() {
  return (
    <div>
      <PageHeader title="New testimonial" backHref="/admin/testimonials" backLabel="Testimonials" />
      <TestimonialForm action={createTestimonial} />
    </div>
  );
}
