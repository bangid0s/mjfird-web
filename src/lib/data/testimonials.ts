import { createPublicClient } from "@/lib/supabase/public";
import { testimonials as placeholderTestimonials, type Testimonial } from "@/lib/placeholder-data";
import { featuredThenNewest, newestFirst, postedAt } from "@/lib/reviews-order";
import { isSupabaseConfigured } from "./config";
import type { TestimonialRow } from "@/lib/supabase/types";

// Explicit columns: the public site never needs the request link itself.
// Tried in order, so the site keeps working before the newer migrations land:
// 0048 adds `featured`, 0033 adds the review columns.
const COLUMN_SETS = [
  "id, quote, name, role, avatar_url, rating, request_id, service_id, service_title, sort_order, created_at, submitted_at, featured",
  "id, quote, name, role, avatar_url, rating, request_id, service_id, service_title, sort_order, created_at, submitted_at",
  "id, quote, name, role, avatar_url, sort_order, created_at",
];

type PublicRow = Pick<
  TestimonialRow,
  | "id"
  | "quote"
  | "name"
  | "role"
  | "avatar_url"
  | "rating"
  | "request_id"
  | "service_id"
  | "service_title"
  | "created_at"
  | "submitted_at"
  | "featured"
>;

const EMPTY_ROW: Omit<PublicRow, "id" | "quote" | "name" | "created_at"> = {
  role: null,
  avatar_url: null,
  rating: null,
  request_id: null,
  service_id: null,
  service_title: null,
  submitted_at: null,
  featured: false,
};

function mapRow(partial: Partial<PublicRow>): Testimonial {
  const row = { ...EMPTY_ROW, ...partial } as PublicRow;
  return {
    id: row.id,
    quote: row.quote,
    name: row.name,
    role: row.role ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    rating: row.rating ?? undefined,
    verified: row.request_id !== null,
    serviceId: row.service_id ?? undefined,
    serviceTitle: row.service_title ?? undefined,
    featured: row.featured === true,
    postedAt: postedAt(row),
  };
}

/** Every published review, newest first. Null when the database can't be read. */
async function fetchPublished(serviceId?: string): Promise<Testimonial[] | null> {
  const supabase = createPublicClient();
  for (const columns of COLUMN_SETS) {
    let query = supabase.from("testimonials").select(columns).eq("status", "published");
    if (serviceId) {
      // Service filters need the 0033 columns; the legacy set can't answer.
      if (!columns.includes("service_id")) return null;
      query = query.eq("service_id", serviceId).not("request_id", "is", null);
    }
    const { data, error } = await query.order("sort_order", { ascending: true });
    if (!error && data) return newestFirst((data as unknown as Partial<PublicRow>[]).map(mapRow));
  }
  return null;
}

/**
 * Published reviews for the home page and résumé: the pinned review first
 * (if any), then newest first. Falls back to placeholders when there are none.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured) return placeholderTestimonials;
  try {
    const reviews = await fetchPublished();
    if (!reviews || reviews.length === 0) return placeholderTestimonials;
    return featuredThenNewest(reviews);
  } catch {
    return placeholderTestimonials;
  }
}

/**
 * Every published review, strictly newest first, for /reviews. Uses the same
 * placeholder fallback as the home page so the "See all reviews" button never
 * leads to an emptier page than the one it came from.
 */
export async function getAllReviews(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured) return placeholderTestimonials;
  try {
    const reviews = await fetchPublished();
    return reviews && reviews.length > 0 ? reviews : placeholderTestimonials;
  } catch {
    return placeholderTestimonials;
  }
}

export type ReviewSummary = { average: number; count: number; reviews: Testimonial[] };

export function summarize(reviews: Testimonial[]): ReviewSummary {
  const rated = reviews.filter((r) => r.verified && typeof r.rating === "number");
  const average = rated.length ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length : 0;
  return { average: Math.round(average * 10) / 10, count: rated.length, reviews };
}

/** Published verified reviews for one service, newest first. No placeholders: an empty list shows nothing. */
export async function getServiceReviews(serviceId: string): Promise<ReviewSummary> {
  const empty = { average: 0, count: 0, reviews: [] };
  if (!isSupabaseConfigured) return empty;
  try {
    const reviews = await fetchPublished(serviceId);
    return reviews ? summarize(reviews) : empty;
  } catch {
    return empty;
  }
}
