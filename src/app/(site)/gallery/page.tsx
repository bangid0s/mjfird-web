import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import GalleryBrowser from "@/components/gallery/GalleryBrowser";
import { getGalleryItems } from "@/lib/data/gallery";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Selected frames — work, process and the floor.",
};

/*
  Lives inside the site chrome rather than the standalone "window" frame the
  /links and /resume pages wear, so it carries the same nav and footer as every
  other page. The route is unchanged: (site) is a group, not a URL segment.
*/
export default async function GalleryPage() {
  const [items, settings] = await Promise.all([getGalleryItems(), getSiteSettings()]);

  return (
    <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <SectionHeader
        index={1}
        eyebrow="Gallery"
        title={settings.galleryHeadline}
        description={settings.galleryIntro || undefined}
        action={
          items.length > 0 ? (
            <p className="mono-meta">
              {items.length} {items.length === 1 ? "frame" : "frames"}
            </p>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <p className="border border-dashed border-line px-6 py-14 text-center text-body-sm text-ink-muted">
          Nothing in the gallery yet.
        </p>
      ) : (
        <GalleryBrowser items={items} />
      )}
    </div>
  );
}
