import Link from "next/link";
import { Field, FieldSection, fieldInputClasses } from "@/components/admin/Field";
import PageHeader from "@/components/admin/PageHeader";
import RowsField from "@/components/admin/RowsField";
import SettingsForm, { ViewPageLink } from "@/components/admin/SettingsForm";
import { loadSettingsRow, type SettingsSearchParams } from "@/lib/admin/settings-row";

const RETAINER_POINTS = ["Priority scheduling", "One point of contact", "Consistent style across every piece", "Monthly invoice"];

export default async function AdminServicesPageText({ searchParams }: { searchParams: SettingsSearchParams }) {
  const [status, settings] = await Promise.all([searchParams, loadSettingsRow()]);

  return (
    <div>
      <PageHeader
        title="Services page"
        description="The text around your services on /services: availability, how a project runs, common questions and the retainer offer."
        action={<ViewPageLink href="/services" />}
      />

      <SettingsForm section="services" status={status} saveLabel="Save services page">
        <FieldSection
          title="Availability"
          description={
            <>
              The services themselves, with packages and prices, are managed in{" "}
              <Link href="/admin/services" className="font-medium text-ink underline underline-offset-4">
                Services
              </Link>
              .
            </>
          }
        >
          <Field label="Availability heading" hint="A line break starts a new line.">
            <textarea
              name="services_availability_heading"
              rows={2}
              defaultValue={settings?.services_availability_heading ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
          <Field label="Line above the heading">
            <input
              name="services_availability_label"
              defaultValue={settings?.services_availability_label ?? ""}
              className={fieldInputClasses}
            />
          </Field>
        </FieldSection>

        <FieldSection title="How a project runs" description="The steps are numbered automatically, in this order.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Small line">
              <input
                name="process_section_eyebrow"
                defaultValue={settings?.process_section_eyebrow ?? "Process"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Title">
              <input
                name="process_section_title"
                defaultValue={settings?.process_section_title ?? "How a project runs"}
                className={fieldInputClasses}
              />
            </Field>
          </div>
          <RowsField
            name="process_steps"
            label="Steps"
            columns={[
              { label: "Step", placeholder: "Brief" },
              { label: "What happens", placeholder: "We agree the goal, the audience and the deadline.", width: "2fr", multiline: true },
            ]}
            initial={(settings?.process_steps ?? []).map((step) => [step.title, step.description])}
            addLabel="Add step"
          />
        </FieldSection>

        <FieldSection title="Common questions" description="With no questions the section is hidden.">
          <RowsField
            name="services_faq"
            label="Questions"
            columns={[
              { label: "Question", placeholder: "How do revisions work?" },
              { label: "Answer", placeholder: "Each package lists its included rounds.", width: "2fr", multiline: true },
            ]}
            initial={(settings?.services_faq ?? []).map((item) => [item.q, item.a])}
            addLabel="Add question"
          />
        </FieldSection>

        <FieldSection
          title="Monthly retainer"
          description="The offer for clients who want ongoing work. It appears on the homepage, /services, the resume and the links page."
        >
          <label className="flex items-center gap-3 text-body-sm font-medium text-ink">
            <input
              type="checkbox"
              name="retainer_enabled"
              defaultChecked={settings?.retainer_enabled ?? true}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Show the retainer offer
          </label>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Small line">
              <input
                name="retainer_eyebrow"
                defaultValue={settings?.retainer_eyebrow ?? "Ongoing work"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Title" hint="Also the label of the retainer button on the links page.">
              <input
                name="retainer_title"
                defaultValue={settings?.retainer_title ?? "Monthly retainer"}
                className={fieldInputClasses}
              />
            </Field>
          </div>

          <Field label="Intro" hint="Who it is for, in a sentence or two.">
            <textarea
              name="retainer_intro"
              rows={3}
              defaultValue={
                settings?.retainer_intro ??
                "A reserved block of illustration and design time every month, for studios and brands with a steady pipeline."
              }
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <RowsField
            name="retainer_points"
            label="What a month includes"
            columns={[{ label: "Point", placeholder: "Priority scheduling" }]}
            initial={(settings?.retainer_points ?? RETAINER_POINTS).map((point) => [point])}
            addLabel="Add point"
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Price label" hint="For example: From $X a month.">
              <input
                name="retainer_price_label"
                defaultValue={settings?.retainer_price_label ?? "Quote on request"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Button label" hint="Goes to /contact with the retainer preselected.">
              <input
                name="retainer_cta_label"
                defaultValue={settings?.retainer_cta_label ?? "Ask about a retainer"}
                className={fieldInputClasses}
              />
            </Field>
          </div>
        </FieldSection>
      </SettingsForm>
    </div>
  );
}
