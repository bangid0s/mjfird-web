import { createClient } from "@/lib/supabase/server";
import { createGalleryItem } from "@/lib/admin/gallery-actions";
import { getSiteSettings } from "@/lib/data/site-settings";
import { fieldInputClasses } from "@/components/admin/Field";
import GalleryItemsList from "@/components/admin/GalleryItemsList";
import GalleryPanel from "@/components/admin/GalleryPanel";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SubmitButton from "@/components/admin/SubmitButton";
import UploadInput from "@/components/admin/UploadInput";
import type { GalleryItemRow } from "@/lib/supabase/types";

export default async function AdminGalleryPage() {
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("gallery_items").select("*").order("sort_order", { ascending: true }),
    getSiteSettings(),
  ]);

  const items = (data as GalleryItemRow[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="The standalone masonry gallery at /gallery — no site nav, just the page. Paste an image address per tile; each one keeps its own proportions, so mixing portrait and landscape is what gives the grid its stagger. Drag to reorder."
        action={
          <a
            href="/gallery"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-5 py-2.5 font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            Preview /gallery →
          </a>
        }
      />

      <GalleryPanel settings={settings} />

      <form action={createGalleryItem} className="mb-10 grid grid-cols-2 items-end gap-3 border border-line p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <UploadInput name="image_url" ariaLabel="Image" placeholder="Paste an image address…" />
        <input name="title" placeholder="Title (optional)" aria-label="Title" className={fieldInputClasses} />
        <input name="caption" placeholder="Caption (optional)" aria-label="Caption" className={fieldInputClasses} />
        <input name="link_url" placeholder="Links to… (optional)" aria-label="Link" className={fieldInputClasses} />
        <SubmitButton pendingLabel="Adding…">Add image</SubmitButton>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No images yet"
          description="Paste an image address above — or drop a file on the field to upload it and fill the address in for you."
        />
      ) : (
        <GalleryItemsList items={items} />
      )}
    </div>
  );
}
