import { Field, fieldInputClasses } from "@/components/admin/Field";
import type { ServiceRow } from "@/lib/supabase/types";
import SubmitButton from "@/components/admin/SubmitButton";

export default function ServiceForm({
  service,
  action,
}: {
  service?: ServiceRow;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-8">
      <Field label="Title">
        <input name="title" defaultValue={service?.title ?? ""} required className={fieldInputClasses} />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={3}
          defaultValue={service?.description ?? ""}
          className={`${fieldInputClasses} resize-none`}
        />
      </Field>

      <Field label="Deliverables — one per line">
        <textarea
          name="deliverables"
          rows={4}
          defaultValue={service?.deliverables?.join("\n") ?? ""}
          className={`${fieldInputClasses} resize-none`}
        />
      </Field>

      <Field label="Status">
        <select name="status" defaultValue={service?.status ?? "draft"} className={fieldInputClasses}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </Field>

      <SubmitButton className="self-start">Save service</SubmitButton>
    </form>
  );
}
