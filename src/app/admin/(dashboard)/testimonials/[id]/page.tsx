import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TestimonialForm from "@/components/admin/TestimonialForm";
import { updateTestimonial } from "@/lib/admin/testimonials-actions";
import PageHeader from "@/components/admin/PageHeader";

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: testimonial } = await supabase.from("testimonials").select("*").eq("id", id).single();

  if (!testimonial) notFound();

  return (
    <div>
      <PageHeader title="Edit testimonial" backHref="/admin/testimonials" backLabel="Testimonials" />
      <TestimonialForm testimonial={testimonial} action={updateTestimonial.bind(null, id)} />
    </div>
  );
}
