import { updateGalleryPanel } from "@/lib/admin/gallery-actions";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import SubmitButton from "@/components/admin/SubmitButton";
import type { SiteSettings } from "@/lib/data/site-settings";

export default function GalleryPanel({ settings }: { settings: SiteSettings }) {
  return (
    <form action={updateGalleryPanel} className="mb-12 flex flex-col gap-6 border border-line p-6">
      <div>
        <h2 className="font-mono text-label uppercase tracking-[0.2em] text-ink">Header</h2>
        <p className="mt-1 font-body text-label text-ink-muted">
          The title and blurb above the masonry grid on /gallery.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Headline">
          <input
            name="gallery_headline"
            defaultValue={settings.galleryHeadline}
            placeholder="Gallery"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Intro">
          <input
            name="gallery_intro"
            defaultValue={settings.galleryIntro}
            placeholder="Selected frames — work, process and the floor."
            className={fieldInputClasses}
          />
        </Field>
      </div>

      <SubmitButton className="self-start">Save header</SubmitButton>
    </form>
  );
}
