import Link from "next/link";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import type { TestimonialRow } from "@/lib/supabase/types";
import SubmitButton, { FormActions } from "@/components/admin/SubmitButton";

export default function TestimonialForm({
  testimonial,
  action,
}: {
  testimonial?: TestimonialRow;
  action: (formData: FormData) => void;
}) {
  const verified = !!testimonial?.request_id;
  const canPublish = !verified || testimonial.public_consent;

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-8">
      {verified ? (
        <section className="flex flex-col gap-3 border border-line bg-bg-raised p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm font-medium text-ink">
              ✓ Verified review{testimonial.service_title ? ` · ${testimonial.service_title}` : ""}
            </p>
            <Link href={`/admin/requests/${testimonial.request_id}`} className="text-body-sm text-ink-muted hover:text-ink">
              Open request →
            </Link>
          </div>
          {testimonial.rating ? (
            <p className="text-accent" aria-label={`${testimonial.rating} out of 5 stars`}>
              {"★".repeat(testimonial.rating)}
              <span className="text-line">{"★".repeat(5 - testimonial.rating)}</span>
            </p>
          ) : null}
          <blockquote className="whitespace-pre-line text-body text-ink">{testimonial.quote}</blockquote>
          <input type="hidden" name="quote" value={testimonial.quote} />
          <p className="text-[13px] text-ink-faint">
            Written by the client, so the words and rating can&apos;t be edited. You can adjust how the name, role and
            avatar appear, approve it, or delete it.
            {!testimonial.public_consent && " The client asked to keep it private, so it can't be published."}
          </p>
        </section>
      ) : (
        <Field label="Quote">
          <textarea
            name="quote"
            rows={3}
            required
            defaultValue={testimonial?.quote ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={testimonial?.name ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Role / company">
          <input name="role" defaultValue={testimonial?.role ?? ""} className={fieldInputClasses} />
        </Field>
      </div>

      <ImageUploader name="avatar_url" label="Avatar (optional)" initialUrl={testimonial?.avatar_url} />

      <Field label="Status">
        <select name="status" defaultValue={testimonial?.status ?? "draft"} className={fieldInputClasses}>
          <option value="draft">Draft</option>
          {canPublish && <option value="published">Published</option>}
        </select>
      </Field>

      <FormActions>
          <SubmitButton>Save testimonial</SubmitButton>
        </FormActions>
    </form>
  );
}
