import { updateLinksStudio } from "@/lib/admin/links-actions";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import SubmitButton from "@/components/admin/SubmitButton";
import { parseOpenDays } from "@/lib/studio-hours";
import type { SiteSettings } from "@/lib/data/site-settings";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const TIMEZONE_LIST_ID = "studio-timezones";

function supportedTimeZones(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    return intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}

export default function LinksStudioPanel({ settings }: { settings: SiteSettings }) {
  const openDays = parseOpenDays(settings.linksOpenDays);
  const brandsValue = settings.linksBrands
    .map((brand) => [brand.name, brand.logoUrl, brand.note, brand.url].join("|").replace(/\|+$/, ""))
    .join("\n");

  return (
    <form action={updateLinksStudio} className="mb-12 flex flex-col gap-8 border border-line p-6">
      <div>
        <h2 className="font-mono text-label uppercase tracking-[0.2em] text-ink">Studio panel</h2>
        <p className="mt-1 font-body text-label text-ink-muted">
          The window header, identity card, opening hours and partner strip on /links.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Window title">
          <input
            name="links_window_title"
            defaultValue={settings.linksWindowTitle}
            placeholder="// Welcome to"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Studio name — blank uses your logo text">
          <input
            name="links_headline"
            defaultValue={settings.linksHeadline}
            placeholder="Rexgraphic Studio"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Run by">
          <input
            name="links_run_by"
            defaultValue={settings.linksRunBy}
            placeholder="Pupung Oktavian"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Tagline — one line per row">
          <textarea
            name="links_intro"
            rows={2}
            defaultValue={settings.linksIntro}
            placeholder={"Merch, Illustration, & Graphics\nHelping clothing brands sell more"}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
        <Field label="Button label">
          <input
            name="links_cta_label"
            defaultValue={settings.linksCtaLabel}
            placeholder="Contact Now"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Button link">
          <input
            name="links_cta_url"
            defaultValue={settings.linksCtaUrl}
            placeholder="/contact"
            className={fieldInputClasses}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-6 border-t border-line pt-6">
        <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
          Opening hours — drives the live open/closed bar
        </legend>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="links_show_status"
            defaultChecked={settings.linksShowStatus}
            className="h-4 w-4 accent-accent"
          />
          <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">
            Show the status bar
          </span>
        </label>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Timezone">
            <input
              name="links_timezone"
              defaultValue={settings.linksTimezone}
              list={TIMEZONE_LIST_ID}
              placeholder="Asia/Jakarta"
              className={fieldInputClasses}
            />
            <datalist id={TIMEZONE_LIST_ID}>
              {supportedTimeZones().map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </Field>
          <Field label="Opens">
            <input
              type="time"
              name="links_open_time"
              defaultValue={settings.linksOpenTime}
              className={fieldInputClasses}
            />
          </Field>
          <Field label="Closes">
            <input
              type="time"
              name="links_close_time"
              defaultValue={settings.linksCloseTime}
              className={fieldInputClasses}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">
            Open days
          </span>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <label key={day.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="open_days"
                  value={day.value}
                  defaultChecked={openDays.includes(day.value)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="font-mono text-label text-ink-muted">{day.label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-6 border-t border-line pt-6">
        <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
          Partner strip &amp; tags
        </legend>

        <Field label="Brands — one per line: Name|logo url|note|link url">
          <textarea
            name="links_brands"
            rows={3}
            defaultValue={brandsValue}
            placeholder="SOTSU|https://…/sotsu.png|affiliator|https://…"
            className={`${fieldInputClasses} resize-none font-mono`}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Empty “Your Brand here” slots (0–6)">
            <input
              type="number"
              name="links_brand_slots"
              min={0}
              max={6}
              defaultValue={settings.linksBrandSlots}
              className={fieldInputClasses}
            />
          </Field>
          <Field label="Where empty slots link to">
            <input
              name="links_brand_cta_url"
              defaultValue={settings.linksBrandCtaUrl}
              placeholder="/contact"
              className={fieldInputClasses}
            />
          </Field>
        </div>

        <Field label="Tag chips — one per line">
          <textarea
            name="links_tags"
            rows={3}
            defaultValue={settings.linksTags.join("\n")}
            placeholder={"Merch\nIllustration\nGraphics"}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
      </fieldset>

      <SubmitButton className="self-start">Save studio panel</SubmitButton>
    </form>
  );
}
