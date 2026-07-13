import { createClient } from "@/lib/supabase/server";
import { saveSiteSettings } from "@/lib/admin/site-settings-actions";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import HeroMediaPicker from "@/components/admin/HeroMediaPicker";
import ImageUploader from "@/components/admin/ImageUploader";
import LogoPicker from "@/components/admin/LogoPicker";
import LinksBgPicker from "@/components/admin/LinksBgPicker";
import { defaultNavLinks } from "@/lib/data/site-settings";
import PageHeader from "@/components/admin/PageHeader";
import type { SiteSettingsRow } from "@/lib/supabase/types";
import SubmitButton from "@/components/admin/SubmitButton";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .single<SiteSettingsRow>();

  const marqueeText = settings?.marquee_items?.join("\n") ?? "";
  const statsText =
    settings?.stats?.map((s) => `${s.value}|${s.suffix}|${s.label}`).join("\n") ?? "";
  const timelineText =
    settings?.about_timeline?.map((t) => `${t.year}|${t.label}|${t.detail}`).join("\n") ?? "";
  const skillsText = settings?.about_skills?.join("\n") ?? "";
  const navLinksText = (settings?.nav_links?.length ? settings.nav_links : defaultNavLinks)
    .map((l) => `${l.label}|${l.href}`)
    .join("\n");
  const processStepsText =
    settings?.process_steps?.map((s) => `${s.title}|${s.description}`).join("\n") ?? "";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Site settings"
        description="Brand, copy, and theme for the whole public site. Changes apply immediately on save."
      />

      {saved && (
        <p className="mb-8 border border-success px-4 py-3 font-mono text-label uppercase tracking-[0.1em] text-success">
          Settings saved — the site is updated.
        </p>
      )}
      {error && (
        <p className="mb-8 border border-error px-4 py-3 font-mono text-label text-error">
          Save failed: {error}. If this mentions a missing column, run the latest file in
          supabase/migrations against your project.
        </p>
      )}

      <form action={saveSiteSettings} className="flex flex-col gap-14">
        <fieldset className="flex flex-col gap-6">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">Brand — whole site</legend>

          <Field label="Accent color">
            <div className="flex items-center gap-4">
              <input
                type="color"
                name="accent_color"
                defaultValue={settings?.accent_color ?? "#ff2e88"}
                className="h-11 w-16 cursor-pointer border border-line bg-transparent"
              />
              <span className="font-mono text-body-sm text-ink-muted">
                Used for buttons, links, and highlights site-wide
              </span>
            </div>
          </Field>

          <Field label="Site title (browser tab / search results)">
            <input name="site_title" defaultValue={settings?.site_title ?? ""} className={fieldInputClasses} />
          </Field>

          <Field label="Site description (SEO / social share)">
            <textarea
              name="site_description"
              rows={2}
              defaultValue={settings?.site_description ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <LogoPicker
            initialType={settings?.logo_type}
            initialText={settings?.logo_text}
            initialUrl={settings?.logo_url}
            initialUrlLight={settings?.logo_url_light}
          />

          <ImageUploader
            name="favicon_url"
            label="Favicon (browser tab icon — square PNG or SVG, at least 64×64)"
            initialUrl={settings?.favicon_url}
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp"
          />
        </fieldset>

        <fieldset className="flex flex-col gap-6 border-t border-line pt-10">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">
            Navigation
          </legend>

          <Field label="Menu links — one per line, “Label|/path”. Order here = order in the menu.">
            <textarea
              name="nav_links"
              rows={7}
              defaultValue={navLinksText}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
          <p className="font-mono text-label text-ink-faint">
            Available pages: /work · /services · /about · /dance · /blog · /contact
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-6 border-t border-line pt-10">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">Homepage — /</legend>

          <Field label="Eyebrow (above the wordmark)">
            <input name="hero_eyebrow" defaultValue={settings?.hero_eyebrow ?? ""} className={fieldInputClasses} />
          </Field>

          <Field label="Intro paragraph">
            <textarea
              name="hero_intro"
              rows={3}
              defaultValue={settings?.hero_intro ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <HeroMediaPicker
            initialType={settings?.hero_media_type}
            initialUrl={settings?.hero_media_url}
            initialImages={settings?.hero_media_urls}
            initialOverlay={settings?.hero_overlay_opacity}
            initialAnimation={settings?.hero_animation}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Primary button label">
              <input name="hero_cta_primary" defaultValue={settings?.hero_cta_primary ?? ""} className={fieldInputClasses} />
            </Field>
            <Field label="Secondary button label">
              <input name="hero_cta_secondary" defaultValue={settings?.hero_cta_secondary ?? ""} className={fieldInputClasses} />
            </Field>
          </div>

          <Field label="Running text (ticker) — one item per line">
            <textarea
              name="marquee_items"
              rows={5}
              defaultValue={marqueeText}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <Field label="Stats — one per line, “value|suffix|label”">
            <textarea
              name="stats"
              rows={4}
              defaultValue={statsText}
              placeholder={"10|+|Years in the cypher\n38||Projects shipped"}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <p className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
            Section headings
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Work section — eyebrow">
              <input
                name="work_section_eyebrow"
                defaultValue={settings?.work_section_eyebrow ?? "Selected Work"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Work section — title">
              <input
                name="work_section_title"
                defaultValue={settings?.work_section_title ?? "Recent moves"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Services section — eyebrow">
              <input
                name="services_section_eyebrow"
                defaultValue={settings?.services_section_eyebrow ?? "Services"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Services section — title">
              <input
                name="services_section_title"
                defaultValue={settings?.services_section_title ?? "What I build"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Testimonials section — eyebrow">
              <input
                name="testimonials_section_eyebrow"
                defaultValue={settings?.testimonials_section_eyebrow ?? "Word on the Floor"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Testimonials section — title">
              <input
                name="testimonials_section_title"
                defaultValue={settings?.testimonials_section_title ?? "What clients say"}
                className={fieldInputClasses}
              />
            </Field>
          </div>

          <p className="font-mono text-label text-ink-faint">
            Which projects appear in the work section is controlled per-project — hit the ★ in
            Projects to feature one.
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-6 border-t border-line pt-10">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">About page — /about</legend>

          <Field label="Headline">
            <textarea
              name="about_headline"
              rows={2}
              defaultValue={settings?.about_headline ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <Field label="About me — one or more paragraphs (blank line = new paragraph). Leave empty to use the bio from Profile.">
            <textarea
              name="about_description"
              rows={6}
              defaultValue={settings?.about_description ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <Field label="Timeline — one entry per line, “year|label|detail”">
            <textarea
              name="about_timeline"
              rows={6}
              defaultValue={timelineText}
              placeholder={"2015|Started breaking|First cypher, first freeze."}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>

          <Field label="Toolkit tags — one per line">
            <textarea
              name="about_skills"
              rows={5}
              defaultValue={skillsText}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-6 border-t border-line pt-10">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">Footer — all pages</legend>

          <Field label="Heading (line break = new line)">
            <textarea
              name="footer_heading"
              rows={2}
              defaultValue={settings?.footer_heading ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
          <Field label="Eyebrow text above heading">
            <input name="footer_subtext" defaultValue={settings?.footer_subtext ?? ""} className={fieldInputClasses} />
          </Field>
          <Field label="Contact email">
            <input
              name="contact_email"
              type="email"
              defaultValue={settings?.contact_email ?? ""}
              className={fieldInputClasses}
            />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-6 border-t border-line pt-10">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">
            Links page — /links
          </legend>

          <LinksBgPicker
            initialType={settings?.links_bg_type}
            initialUrl={settings?.links_bg_url}
            initialOverlay={settings?.links_overlay_opacity}
          />
          <p className="font-mono text-label text-ink-faint">
            The buttons themselves are managed under “Links Page” in the sidebar.
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-6 border-t border-line pt-10">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">Dance page — /dance</legend>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Eyebrow">
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
        </fieldset>

        <fieldset className="flex flex-col gap-6 border-t border-line pt-10">
          <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-accent">Services page — /services</legend>

          <Field label="Availability heading (line break = new line)">
            <textarea
              name="services_availability_heading"
              rows={2}
              defaultValue={settings?.services_availability_heading ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
          <Field label="Availability eyebrow text">
            <input
              name="services_availability_label"
              defaultValue={settings?.services_availability_label ?? ""}
              className={fieldInputClasses}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Process section — eyebrow">
              <input
                name="process_section_eyebrow"
                defaultValue={settings?.process_section_eyebrow ?? "Process"}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Process section — title">
              <input
                name="process_section_title"
                defaultValue={settings?.process_section_title ?? "How a project runs"}
                className={fieldInputClasses}
              />
            </Field>
          </div>

          <Field label="Process steps — one per line, “Title|Description” (numbered automatically)">
            <textarea
              name="process_steps"
              rows={5}
              defaultValue={processStepsText}
              placeholder={"Discovery|A working session to pin down goals.\nBuild|Design system first, then pages."}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
        </fieldset>

        <SubmitButton className="self-start">Save settings</SubmitButton>
      </form>
    </div>
  );
}
