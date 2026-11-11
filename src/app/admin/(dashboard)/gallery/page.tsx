import { createClient } from "@/lib/supabase/server";
import { createGalleryItem } from "@/lib/admin/gallery-actions";
import { getSiteSettings } from "@/lib/data/site-settings";
import { fieldInputClasses } from "@/components/admin/Field";
import GalleryItemsList, { TAG_LIST_ID } from "@/components/admin/GalleryItemsList";
import GalleryPanel from "@/components/admin/GalleryPanel";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SubmitButton from "@/components/admin/SubmitButton";
import UploadInput from "@/components/admin/UploadInput";
import GalleryLinkFields, { type ReviewOption, type ServiceOption } from "@/components/admin/GalleryLinkFields";
import type { GalleryItemRow, ServiceRow, TestimonialRow } from "@/lib/supabase/types";

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const [{ data }, { data: serviceRows }, { data: reviewRows }, settings, { error: saveError }] = await Promise.all([
    supabase.from("gallery_items").select("*").order("sort_order", { ascending: true }),
    supabase.from("services").select("id, title, status").order("sort_order", { ascending: true }),
    supabase
      .from("testimonials")
      .select("id, name, quote, rating, request_id, status, service_id")
      .order("sort_order", { ascending: true }),
    getSiteSettings(),
    searchParams,
  ]);

  const items = (data as GalleryItemRow[]) ?? [];
  const services: ServiceOption[] = ((serviceRows ?? []) as Pick<ServiceRow, "id" | "title" | "status">[]).map((s) => ({
    id: s.id,
    title: s.title,
    live: s.status === "published",
  }));
  const reviews: ReviewOption[] = (
    (reviewRows ?? []) as Pick<TestimonialRow, "id" | "name" | "quote" | "rating" | "request_id" | "status" | "service_id">[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    quote: r.quote,
    rating: r.rating ?? null,
    verified: Boolean(r.request_id),
    live: r.status === "published",
    serviceId: r.service_id ?? null,
  }));
  // Offer the tags already in use so the same category doesn't end up spelled
  // three different ways — the filter on /gallery matches them exactly.
  const tags = [...new Set(items.flatMap((item) => item.tags ?? []).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="The masonry gallery at /gallery. Paste an image address per tile; each one keeps its own proportions, so mixing portrait and landscape is what gives the grid its stagger. Tags become the filter chips above the grid. Open an image's “Sample of” row to file it under services — it then shows on those service pages as a sample, with the client name and review you attach. Drag to reorder."
        action={
          <a
            href="/gallery"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-5 py-2.5 text-body-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            Preview /gallery →
          </a>
        }
      />

      <GalleryPanel settings={settings} />

      {saveError && (
        <p role="alert" className="mb-6 border border-error/40 px-4 py-3 text-body-sm text-error">
          Couldn&apos;t save: {saveError}. If this mentions service_ids, client_name or testimonial_id, run migration
          0039_gallery_service_links.sql in Supabase first.
        </p>
      )}

      <datalist id={TAG_LIST_ID}>
        {tags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      <form action={createGalleryItem} className="mb-10 grid grid-cols-2 items-end gap-3 border border-line p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
        <UploadInput name="image_url" ariaLabel="Image" placeholder="Paste an image address…" />
        <input name="title" placeholder="Title (optional)" aria-label="Title" className={fieldInputClasses} />
        <input name="caption" placeholder="Caption (optional)" aria-label="Caption" className={fieldInputClasses} />
        <input name="tags" list={TAG_LIST_ID} placeholder="Tags, comma separated" aria-label="Tags" className={fieldInputClasses} />
        <input name="link_url" placeholder="Links to… (optional)" aria-label="Link" className={fieldInputClasses} />
        <SubmitButton pendingLabel="Adding…">Add image</SubmitButton>
        <GalleryLinkFields services={services} reviews={reviews} />
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No images yet"
          description="Paste an image address above — or drop a file on the field to upload it and fill the address in for you."
        />
      ) : (
        <GalleryItemsList items={items} services={services} reviews={reviews} />
      )}
    </div>
  );
}
