import type { Metadata } from "next";
import { getGalleryItems } from "@/lib/data/gallery";
import { getSiteSettings } from "@/lib/data/site-settings";
import Analytics from "@/components/analytics/Analytics";
import GalleryBrowser from "@/components/gallery/GalleryBrowser";
import StandaloneWindow from "@/components/standalone/StandaloneWindow";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Selected frames — work, process and the floor.",
};

export default async function GalleryPage() {
  const [items, settings] = await Promise.all([getGalleryItems(), getSiteSettings()]);

  return (
    <>
      <StandaloneWindow title="// Gallery" width="wide">
        <header className="flex flex-col gap-2 rounded-2xl bg-bg-raised p-5 lg:p-6">
          <h1 className="font-display text-display-sm uppercase leading-[0.95] text-ink">
            {settings.galleryHeadline}
          </h1>
          {settings.galleryIntro && (
            <p className="max-w-prose font-body text-body-sm text-ink-muted">
              {settings.galleryIntro}
            </p>
          )}
        </header>

        {items.length === 0 ? (
          <p className="rounded-2xl bg-bg-raised p-5 font-body text-body-sm text-ink-faint lg:p-6">
            Nothing in the gallery yet.
          </p>
        ) : (
          <GalleryBrowser items={items} />
        )}
      </StandaloneWindow>

      <Analytics measurementId={settings.gaMeasurementId} />
    </>
  );
}
