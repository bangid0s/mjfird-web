import Link from "next/link";
import { Field, FieldSection, fieldInputClasses } from "@/components/admin/Field";
import PageHeader from "@/components/admin/PageHeader";
import RowsField from "@/components/admin/RowsField";
import SettingsForm, { ViewPageLink } from "@/components/admin/SettingsForm";
import { loadSettingsRow, type SettingsSearchParams } from "@/lib/admin/settings-row";

export default async function AdminAboutPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const [status, settings] = await Promise.all([searchParams, loadSettingsRow()]);

  return (
    <div>
      <PageHeader
        title="About page"
        description="Your story, timeline and toolkit on /about."
        action={<ViewPageLink href="/about" />}
      />

      <SettingsForm section="about" status={status} saveLabel="Save about page">
        <FieldSection
          title="Introduction"
          description={
            <>
              Your portrait, name and availability come from{" "}
              <Link href="/admin/profile" className="font-medium text-ink underline underline-offset-4">
                Profile
              </Link>
              .
            </>
          }
        >
          <Field label="Headline">
            <textarea
              name="about_headline"
              rows={2}
              defaultValue={settings?.about_headline ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
          <Field label="About me" hint="A blank line starts a new paragraph. Leave empty to use the bio from Profile.">
            <textarea
              name="about_description"
              rows={8}
              defaultValue={settings?.about_description ?? ""}
              className={`${fieldInputClasses} resize-y`}
            />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Button label" hint="Blank hides the button.">
              <input
                name="about_cta_label"
                defaultValue={settings?.about_cta_label ?? ""}
                placeholder="See the dance side"
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Button link">
              <input
                name="about_cta_url"
                defaultValue={settings?.about_cta_url ?? ""}
                placeholder="/dance"
                className={fieldInputClasses}
              />
            </Field>
          </div>
        </FieldSection>

        <FieldSection title="Timeline" description="Shown newest first. The six most recent are open; older ones sit behind a button.">
          <RowsField
            name="about_timeline"
            label="Milestones"
            columns={[
              { label: "Year", placeholder: "2021", width: "6rem" },
              { label: "What happened", placeholder: "Went full-time" },
              { label: "Detail", placeholder: "One sentence of context.", width: "2fr", multiline: true },
            ]}
            initial={(settings?.about_timeline ?? []).map((item) => [item.year, item.label, item.detail])}
            addLabel="Add milestone"
          />
        </FieldSection>

        <FieldSection title="Toolkit" description="Short tags: skills, disciplines, software.">
          <RowsField
            name="about_skills"
            label="Tags"
            columns={[{ label: "Tag", placeholder: "Character design" }]}
            initial={(settings?.about_skills ?? []).map((skill) => [skill])}
            addLabel="Add tag"
          />
        </FieldSection>
      </SettingsForm>
    </div>
  );
}
