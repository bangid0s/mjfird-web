import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import type { TestimonialRow } from "@/lib/supabase/types";
import SubmitButton from "@/components/admin/SubmitButton";

export default function TestimonialForm({
  testimonial,
  action,
}: {
  testimonial?: TestimonialRow;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-8">
      <Field label="Quote">
        <textarea
          name="quote"
          rows={3}
          required
          defaultValue={testimonial?.quote ?? ""}
          className={`${fieldInputClasses} resize-none`}
        />
      </Field>

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
          <option value="published">Published</option>
        </select>
      </Field>

      <SubmitButton className="self-start">Save testimonial</SubmitButton>
    </form>
  );
}
