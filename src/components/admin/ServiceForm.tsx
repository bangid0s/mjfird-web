import { Field, FieldSection, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import GalleryUploader from "@/components/admin/GalleryUploader";
import { AddonsEditor, FaqEditor, LicensesEditor, PackagesEditor, QuestionsEditor } from "@/components/admin/ServiceBuilderEditors";
import type { ServiceRow } from "@/lib/supabase/types";
import { mapStorefrontRow } from "@/lib/data/services";
import { DEFAULT_LICENSES } from "@/lib/services/storefront";
import SubmitButton, { FormActions } from "@/components/admin/SubmitButton";

export default function ServiceForm({
  service,
  action,
}: {
  service?: ServiceRow;
  action: (formData: FormData) => void;
}) {
  const store = service ? mapStorefrontRow(service) : null;

  return (
    <form action={action} className="flex max-w-4xl flex-col gap-10">
      <FieldSection title="Basics" description="What the service is, and where it lives on the site.">
        <Field label="Title">
          <input name="title" defaultValue={service?.title ?? ""} required className={fieldInputClasses} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="URL slug — leave blank to generate from the title">
            <input
              name="slug"
              defaultValue={service?.slug ?? ""}
              placeholder="character-illustration"
              className={fieldInputClasses}
            />
          </Field>
          <Field label="Category — groups services into filter chips, e.g. Illustration">
            <input name="category" defaultValue={service?.category ?? ""} className={fieldInputClasses} />
          </Field>
        </div>

        <Field label="Short description — one or two lines, shown on the card">
          <textarea
            name="description"
            rows={2}
            defaultValue={service?.description ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>

        <Field label="Full details — shown on the service page; blank lines start new paragraphs">
          <textarea
            name="details"
            rows={6}
            defaultValue={service?.details ?? ""}
            className={`${fieldInputClasses} resize-y`}
          />
        </Field>

        <Field label="Homepage deliverables — one per line, shown in the homepage services section">
          <textarea
            name="deliverables"
            rows={3}
            defaultValue={service?.deliverables?.join("\n") ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
      </FieldSection>

      <FieldSection
        title="Availability"
        description="Open takes requests. Waitlist still takes requests but marks them as queued. Closed hides the request button."
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Status">
            <select name="availability" defaultValue={service?.availability ?? "open"} className={fieldInputClasses}>
              <option value="open">Open</option>
              <option value="waitlist">Waitlist</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <Field label="Total slots — blank = unlimited">
            <input
              name="slots_total"
              type="number"
              min={0}
              defaultValue={service?.slots_total ?? ""}
              className={fieldInputClasses}
            />
          </Field>
          <Field label="Slots taken">
            <input
              name="slots_taken"
              type="number"
              min={0}
              defaultValue={service?.slots_taken ?? 0}
              className={fieldInputClasses}
            />
          </Field>
        </div>
        <p className="text-[13px] text-ink-faint">When every slot is taken, an open service shows as Waitlist automatically.</p>
      </FieldSection>

      <FieldSection title="Images" description="A cover for the card, and a gallery of past work for the service page.">
        <ImageUploader
          name="image_url"
          label="Cover image — blank uses the first sample"
          initialUrl={service?.image_url}
        />
        <GalleryUploader name="samples" label="Samples — examples of this service" initial={store?.samples} />
      </FieldSection>

      <FieldSection title="Packages" description="The tiers a client chooses between. All prices in USD.">
        <PackagesEditor initial={store?.packages ?? []} />
      </FieldSection>

      <FieldSection title="Add-ons" description="Optional extras the client can tick on top of a package.">
        <AddonsEditor initial={store?.addons ?? []} />
      </FieldSection>

      <FieldSection
        title="Usage license"
        description="How the client may use the art. Personal use is the default and always offered; the others add a percentage of the order total (package × characters + add-ons)."
      >
        <LicensesEditor initial={store?.licenses ?? DEFAULT_LICENSES} />
      </FieldSection>

      <FieldSection title="Will / won't draw" description="Set expectations before anyone requests.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Will do — one per line">
            <textarea
              name="will_draw"
              rows={5}
              defaultValue={service?.will_draw?.join("\n") ?? ""}
              className={`${fieldInputClasses} resize-y`}
            />
          </Field>
          <Field label="Won't do — one per line">
            <textarea
              name="wont_draw"
              rows={5}
              defaultValue={service?.wont_draw?.join("\n") ?? ""}
              className={`${fieldInputClasses} resize-y`}
            />
          </Field>
        </div>
      </FieldSection>

      <FieldSection title="Request form" description="Extra questions clients answer when they request this service.">
        <QuestionsEditor initial={store?.questions ?? []} />
      </FieldSection>

      <FieldSection title="FAQ & terms">
        <FaqEditor initial={store?.faq ?? []} />
        <Field label="Terms of service — usage rights, refunds, timelines">
          <textarea
            name="terms"
            rows={6}
            defaultValue={service?.terms ?? ""}
            className={`${fieldInputClasses} resize-y`}
          />
        </Field>
      </FieldSection>

      <FieldSection title="Publish">
        <Field label="Status">
          <select name="status" defaultValue={service?.status ?? "draft"} className={fieldInputClasses}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
      </FieldSection>

      <FormActions>
        <SubmitButton>Save service</SubmitButton>
      </FormActions>
    </form>
  );
}
