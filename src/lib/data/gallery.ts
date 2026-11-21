import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { GalleryItemRow } from "@/lib/supabase/types";

/** A service an image is a sample of — enough to link to its page. */
export type GalleryServiceLink = { id: string; slug: string; title: string };

/** The client review shown with an image. */
export type GalleryReview = {
  quote: string;
  name: string;
  role: string;
  rating?: number;
  /** Written by the client from a completed order on this site. */
  verified: boolean;
  /** When the review was written (ISO), for "Nov 2026". */
  date?: string;
};

export type GalleryItem = {
  /** Stable across filtering, so tiles aren't remounted (and images refetched). */
  id: string;
  /** Its own page, /gallery/<slug>. Absent on manual service samples and before migration 0054. */
  slug?: string;
  imageUrl: string;
  title: string;
  caption: string;
  linkUrl: string;
  /** Categories this image is filed under; drives the filter on /gallery. */
  tags: string[];
  /** Published services this image is a sample of. */
  services: GalleryServiceLink[];
  /** Who it was made for. Falls back to the reviewer's name. */
  clientName: string;
  review?: GalleryReview;
  /** When the image was added (ISO). Absent on manual service samples. */
  publishedAt?: string;
  /** Added from a delivered order on this site (not a manual upload). */
  fromCommission?: boolean;
};

// Nothing to show until the admin pastes some image addresses in — an empty
// gallery renders its own empty state rather than fake tiles.
const placeholderItems: GalleryItem[] = [];

// The public can only read published reviews (RLS), so a draft or private
// review linked to an image comes back as null and is simply not shown.
const REVIEW_EMBED = "review:testimonials(quote, name, role, rating, request_id, created_at)";

type ReviewEmbed = {
  quote: string;
  name: string;
  role: string | null;
  rating: number | null;
  request_id: string | null;
  created_at?: string | null;
} | null;

type Row = GalleryItemRow & { review?: ReviewEmbed | ReviewEmbed[] };

function mapReview(embed: Row["review"]): GalleryReview | undefined {
  const r = Array.isArray(embed) ? embed[0] : embed;
  if (!r || !r.quote) return undefined;
  return {
    quote: r.quote,
    name: r.name,
    role: r.role ?? "",
    rating: r.rating ?? undefined,
    verified: r.request_id !== null && r.request_id !== undefined,
    date: r.created_at ?? undefined,
  };
}

export function mapGalleryRow(row: Row, services: Map<string, GalleryServiceLink>): GalleryItem {
  const review = mapReview(row.review);
  return {
    id: row.id,
    slug: row.slug ?? undefined,
    imageUrl: row.image_url,
    title: row.title ?? "",
    caption: row.caption ?? "",
    linkUrl: row.link_url ?? "",
    tags: (row.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    services: (row.service_ids ?? []).flatMap((id) => services.get(id) ?? []),
    clientName: (row.client_name ?? "").trim() || review?.name || "",
    review,
    publishedAt: row.created_at || undefined,
    fromCommission: Boolean(row.request_id),
  };
}

/** Published services by id, for turning `service_ids` into links. */
async function getServiceLinks(): Promise<Map<string, GalleryServiceLink>> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("services").select("id, slug, title").eq("status", "published");
  return new Map((data ?? []).map((s) => [s.id as string, s as GalleryServiceLink]));
}

type GalleryQuery = { serviceId?: string };

async function queryGallery({ serviceId }: GalleryQuery = {}): Promise<GalleryItem[]> {
  const supabase = createPublicClient();
  const query = (columns: string) => {
    let q = supabase.from("gallery_items").select(columns).eq("status", "published");
    if (serviceId) q = q.contains("service_ids", [serviceId]);
    return q.order("sort_order", { ascending: true });
  };

  const [first, services] = await Promise.all([query(`*, ${REVIEW_EMBED}`), getServiceLinks()]);
  let { data, error } = first;
  // Before migration 0039 the link columns don't exist: the gallery still
  // works, it just can't say which service an image belongs to.
  if (error) {
    if (serviceId) return [];
    ({ data, error } = await query("*"));
  }
  if (error || !data) return [];
  const rows = await attachOrderReviews(supabase, (data as unknown as Row[]).filter((row) => row.image_url));
  return rows.map((row) => mapGalleryRow(row, services));
}

/*
  An image made from a delivered order shows that order's review on its own,
  once the client has written it with public consent and it is approved (the
  public can only read published reviews, and publishing one needs consent).
  A review linked by hand in the admin still wins.
*/
async function attachOrderReviews(supabase: ReturnType<typeof createPublicClient>, rows: Row[]): Promise<Row[]> {
  const requestIds = rows.filter((row) => row.request_id && !mapReview(row.review)).map((row) => row.request_id!);
  if (requestIds.length === 0) return rows;
  const { data } = await supabase
    .from("testimonials")
    .select("quote, name, role, rating, request_id, created_at")
    .in("request_id", requestIds)
    .eq("status", "published");
  const byRequest = new Map((data ?? []).map((review) => [review.request_id as string, review as ReviewEmbed]));
  return rows.map((row) =>
    row.request_id && !mapReview(row.review) && byRequest.has(row.request_id)
      ? { ...row, review: byRequest.get(row.request_id) }
      : row,
  );
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured) return placeholderItems;
  try {
    return await queryGallery();
  } catch {
    return placeholderItems;
  }
}

/** One published gallery image by its page address. */
export async function getGalleryItem(slug: string): Promise<GalleryItem | undefined> {
  const items = await getGalleryItems();
  return items.find((item) => item.slug === slug);
}

/** Gallery images filed under one service — its samples, in gallery order. */
export async function getServiceSamples(serviceId: string): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured) return [];
  try {
    return await queryGallery({ serviceId });
  } catch {
    return [];
  }
}

/** First linked gallery image per service, for service cards without a cover. */
export async function getServiceCovers(): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  if (!isSupabaseConfigured) return covers;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .select("image_url, service_ids")
      .eq("status", "published")
      .neq("service_ids", "{}")
      .order("sort_order", { ascending: true });
    if (error || !data) return covers;
    for (const row of data as Pick<GalleryItemRow, "image_url" | "service_ids">[]) {
      for (const id of row.service_ids ?? []) {
        if (row.image_url && !covers.has(id)) covers.set(id, row.image_url);
      }
    }
  } catch {
    // no covers — cards fall back to their own image or none
  }
  return covers;
}

/** Manual `services.samples` entries in the same shape, so one grid shows both. */
export function samplesAsGalleryItems(samples: { url: string; alt: string }[], prefix: string): GalleryItem[] {
  return samples.map((s, i) => ({
    id: `${prefix}-${i}`,
    imageUrl: s.url,
    title: s.alt,
    caption: "",
    linkUrl: "",
    tags: [],
    services: [],
    clientName: "",
  }));
}
