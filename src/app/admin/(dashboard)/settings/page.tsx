import Link from "next/link";
import { Field, FieldSection, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import LogoPicker from "@/components/admin/LogoPicker";
import PageHeader from "@/components/admin/PageHeader";
import RowsField from "@/components/admin/RowsField";
import SettingsForm from "@/components/admin/SettingsForm";
import SharePicker from "@/components/admin/SharePicker";
import { loadSettingsRow, type SettingsSearchParams } from "@/lib/admin/settings-row";
import { defaultNavLinks } from "@/lib/data/site-settings";
import { isValidGaId } from "@/lib/analytics";
import { SITE_HOST } from "@/lib/site-url";

// Where each page's own copy is edited now that it no longer lives here.
const PAGE_SCREENS = [
  { href: "/admin/pages/home", label: "Home page" },
  { href: "/admin/pages/about", label: "About page" },
  { href: "/admin/pages/services", label: "Services page" },
  { href: "/admin/pages/dance", label: "Dance page" },
  { href: "/admin/links", label: "Links page" },
  { href: "/admin/resume", label: "Resume page" },
  { href: "/admin/gallery", label: "Gallery page" },
];

export default async function AdminSettingsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const [status, settings] = await Promise.all([searchParams, loadSettingsRow()]);
  const navLinks = settings?.nav_links?.length ? settings.nav_links : defaultNavLinks;
  const gaId = settings?.ga_measurement_id ?? "";

  return (
    <div>
      <PageHeader
        title="Site settings"
        description="What every page shares: brand, link previews, analytics, the menu and the footer."
      />

      <nav aria-label="Page text" className="mb-10 flex flex-col gap-3 border border-line bg-bg-raised px-5 py-4">
        <p className="text-body-sm text-ink-muted">
          Text for a single page is edited on that page&rsquo;s own screen:
        </p>
        <ul className="flex flex-wrap gap-2">
          {PAGE_SCREENS.map((screen) => (
            <li key={screen.href}>
              <Link
                href={screen.href}
                className="inline-flex h-9 items-center border border-line bg-bg px-3 text-body-sm font-medium text-ink transition-colors hover:border-ink"
              >
                {screen.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <SettingsForm section="site" status={status} saveLabel="Save site settings">
        <FieldSection title="Brand" description="Colour, name and logo, used on every page.">
          <Field label="Accent color" hint="Used for buttons, links and highlights site-wide.">
            <input
              type="color"
              name="accent_color"
              defaultValue={settings?.accent_color ?? "#f04e23"}
              className="h-11 w-16 cursor-pointer border border-line bg-transparent"
            />
          </Field>

          <Field label="Site title" hint="Shown in the browser tab and in search results.">
            <input name="site_title" defaultValue={settings?.site_title ?? ""} className={fieldInputClasses} />
          </Field>

          <Field label="Site description" hint="Shown under the title in search results and link previews.">
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
        </FieldSection>

        <FieldSection
          title="Link preview"
          description={`The thumbnail and text shown when ${SITE_HOST} is pasted into X, WhatsApp, LinkedIn or Slack. Projects and blog posts can set their own image on their edit page.`}
        >
          <SharePicker
            initialMode={settings?.share_image_mode}
            initialImageUrl={settings?.share_image_url}
            initialTitle={settings?.share_title}
            initialDescription={settings?.share_description}
            initialEyebrow={settings?.share_card_eyebrow}
            initialHeadline={settings?.share_card_headline}
            initialBgUrl={settings?.share_card_bg_url}
            initialOverlay={settings?.share_card_overlay_opacity}
            initialHandle={settings?.share_twitter_handle}
            fallbackTitle={settings?.site_title ?? ""}
            fallbackDescription={settings?.site_description ?? ""}
            fallbackEyebrow={settings?.hero_eyebrow ?? ""}
            fallbackHeadline={settings?.logo_text || "MJFIRD"}
            host={SITE_HOST}
          />
        </FieldSection>

        <FieldSection
          title="Menu"
          description="The links in the site header, in this order. Contact always shows as the button."
        >
          <RowsField
            name="nav_links"
            label="Menu links"
            hint="Paths start with a slash: /work, /services, /about, /dance, /gallery, /blog, /contact."
            columns={[
              { label: "Label", placeholder: "Work" },
              { label: "Path", placeholder: "/work" },
            ]}
            initial={navLinks.map((link) => [link.label, link.href])}
            addLabel="Add menu link"
          />
        </FieldSection>

        <FieldSection title="Footer" description="The closing band at the bottom of every page.">
          <Field label="Heading" hint="A line break starts a new line.">
            <textarea
              name="footer_heading"
              rows={2}
              defaultValue={settings?.footer_heading ?? ""}
              className={`${fieldInputClasses} resize-none`}
            />
          </Field>
          <Field label="Line above the heading">
            <input name="footer_subtext" defaultValue={settings?.footer_subtext ?? ""} className={fieldInputClasses} />
          </Field>
          <Field label="Contact email" hint="Shown in the footer and used as the resume's email unless it sets its own.">
            <input
              name="contact_email"
              type="email"
              defaultValue={settings?.contact_email ?? ""}
              className={fieldInputClasses}
            />
          </Field>
        </FieldSection>

        <FieldSection
          title="Analytics"
          description="Only public pages report. The admin is never tracked, and nothing is sent while the site runs locally."
        >
          <Field
            label="Google Analytics measurement ID"
            hint="Google Analytics, Admin, Data streams, your web stream. Leave blank to switch tracking off."
          >
            <input
              name="ga_measurement_id"
              defaultValue={gaId}
              placeholder="G-XXXXXXXXXX"
              className={fieldInputClasses}
            />
          </Field>
          {gaId && !isValidGaId(gaId) && (
            <p className="text-body-sm text-error">
              That doesn&rsquo;t look like a measurement ID. They start with &ldquo;G-&rdquo;. Tracking stays off
              until it does.
            </p>
          )}
        </FieldSection>
      </SettingsForm>
    </div>
  );
}
