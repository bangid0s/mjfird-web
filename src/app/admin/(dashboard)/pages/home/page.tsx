import { Field, FieldSection, fieldInputClasses } from "@/components/admin/Field";
import HeroMediaPicker from "@/components/admin/HeroMediaPicker";
import PageHeader from "@/components/admin/PageHeader";
import RowsField from "@/components/admin/RowsField";
import SettingsForm, { ViewPageLink } from "@/components/admin/SettingsForm";
import { loadSettingsRow, type SettingsSearchParams } from "@/lib/admin/settings-row";

export default async function AdminHomePage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const [status, settings] = await Promise.all([searchParams, loadSettingsRow()]);

  return (
    <div>
      <PageHeader
        title="Home page"
        description="The hero, the numbers under it and the headings of each homepage section. Which projects appear is set per project: star one in Projects to feature it."
        action={<ViewPageLink href="/" />}
      />

      <SettingsForm section="home" status={status} saveLabel="Save home page">
        <FieldSection title="Hero text" description="The first thing a visitor reads.">
          <Field label="Headline" hint="What you do and for whom. Blank shows the MJFIRD wordmark instead.">
            <input name="hero_headline" defaultValue={settings?.hero_headline ?? ""} className={fieldInputClasses} />
          </Field>
          <Field label="Line above the headline" hint="Used by any slide that doesn't set its own.">
            <input name="hero_eyebrow" defaultValue={settings?.hero_eyebrow ?? ""} className={fieldInputClasses} />
          </Field>
          <Field label="Intro paragraph" hint="Used by any slide that doesn't set its own.">
            <textarea
              name="hero_intro"
              rows={3}
              defaultValue={settings?.hero_intro ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Main button" hint="Goes to /work unless a slide sets its own link.">
              <input name="hero_cta_primary" defaultValue={settings?.hero_cta_primary ?? ""} className={fieldInputClasses} />
            </Field>
            <Field label="Second button" hint="Always goes to /contact.">
              <input name="hero_cta_secondary" defaultValue={settings?.hero_cta_secondary ?? ""} className={fieldInputClasses} />
            </Field>
          </div>
        </FieldSection>

        <FieldSection title="Hero image or video" description="The media beside the hero text.">
          <HeroMediaPicker
            initialType={settings?.hero_media_type}
            initialUrl={settings?.hero_media_url}
            initialImages={settings?.hero_media_urls}
            initialOverlay={settings?.hero_overlay_opacity}
            initialAnimation={settings?.hero_animation}
            initialSlideDuration={settings?.hero_slide_duration}
          />
        </FieldSection>

        <FieldSection
          title="Numbers"
          description="The figures under the hero. They also appear on the resume page, so they are worth keeping current."
        >
          <RowsField
            name="stats"
            label="Stats"
            hint="The first four are shown."
            columns={[
              { label: "Number", placeholder: "15", width: "6rem" },
              { label: "Suffix", placeholder: "", width: "5rem" },
              { label: "What it counts", placeholder: "Years as an artist", width: "2fr" },
            ]}
            initial={(settings?.stats ?? []).map((stat) => [String(stat.value), stat.suffix, stat.label])}
            addLabel="Add stat"
          />
          <Field label="Proof note" hint="One short credential beside the stats, such as a marketplace rating. Blank hides it.">
            <input name="hero_proof_note" defaultValue={settings?.hero_proof_note ?? ""} className={fieldInputClasses} />
          </Field>
        </FieldSection>

        <FieldSection title="Section headings" description="The small line and the title above each homepage section.">
          {[
            { key: "work", name: "Work", eyebrow: "Selected Work", title: "Recent moves" },
            { key: "services", name: "Services", eyebrow: "Services", title: "What I build" },
            { key: "testimonials", name: "Testimonials", eyebrow: "Word on the Floor", title: "What clients say" },
          ].map((section) => {
            const row = settings as Record<string, unknown> | null;
            const value = (column: string, fallback: string) => (row?.[column] as string | null | undefined) ?? fallback;
            return (
              <div key={section.key} className="grid gap-6 sm:grid-cols-2">
                <Field label={`${section.name}: small line`}>
                  <input
                    name={`${section.key}_section_eyebrow`}
                    defaultValue={value(`${section.key}_section_eyebrow`, section.eyebrow)}
                    className={fieldInputClasses}
                  />
                </Field>
                <Field label={`${section.name}: title`}>
                  <input
                    name={`${section.key}_section_title`}
                    defaultValue={value(`${section.key}_section_title`, section.title)}
                    className={fieldInputClasses}
                  />
                </Field>
              </div>
            );
          })}
        </FieldSection>
      </SettingsForm>
    </div>
  );
}
