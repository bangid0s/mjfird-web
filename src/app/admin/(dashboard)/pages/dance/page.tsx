import Link from "next/link";
import { Field, FieldSection, fieldInputClasses } from "@/components/admin/Field";
import PageHeader from "@/components/admin/PageHeader";
import SettingsForm, { ViewPageLink } from "@/components/admin/SettingsForm";
import { loadSettingsRow, type SettingsSearchParams } from "@/lib/admin/settings-row";

export default async function AdminDancePageText({ searchParams }: { searchParams: SettingsSearchParams }) {
  const [status, settings] = await Promise.all([searchParams, loadSettingsRow()]);

  return (
    <div>
      <PageHeader
        title="Dance page"
        description="The heading and intro on /dance."
        action={<ViewPageLink href="/dance" />}
      />

      <SettingsForm section="dance" status={status} saveLabel="Save dance page">
        <FieldSection
          title="Heading"
          description={
            <>
              The reel, stills and battle record are managed in{" "}
              <Link href="/admin/dance" className="font-medium text-ink underline underline-offset-4">
                Dance media
              </Link>
              .
            </>
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Small line">
              <input
                name="dance_section_eyebrow"
                defaultValue={settings?.dance_section_eyebrow ?? "Dance"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Title">
              <input
                name="dance_section_title"
                defaultValue={settings?.dance_section_title ?? "The other half"}
                className={fieldInputClasses}
              />
            </Field>
          </div>
          <Field label="Intro paragraph">
            <textarea
              name="dance_intro"
              rows={3}
              defaultValue={settings?.dance_intro ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
        </FieldSection>
      </SettingsForm>
    </div>
  );
}
