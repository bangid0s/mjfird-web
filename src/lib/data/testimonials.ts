import { createPublicClient } from "@/lib/supabase/public";
import { testimonials as placeholderTestimonials, type Testimonial } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "./config";
import type { TestimonialRow } from "@/lib/supabase/types";

// Explicit columns: the public site never needs the request link itself.
const PUBLIC_COLUMNS = "id, quote, name, role, avatar_url, rating, request_id, service_id, service_title, sort_order";
const LEGACY_COLUMNS = "id, quote, name, role, avatar_url, sort_order";

type PublicRow = Pick<
  TestimonialRow,
  "id" | "quote" | "name" | "role" | "avatar_url" | "rating" | "request_id" | "service_id" | "service_title"
>;

function mapRow(row: PublicRow): Testimonial {
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
  };
}

export async function getTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured) return placeholderTestimonials;
  try {
    const supabase = createPublicClient();
    const query = (columns: string) =>
      supabase.from("testimonials").select(columns).eq("status", "published").order("sort_order", { ascending: true });
    let { data, error } = await query(PUBLIC_COLUMNS);
    // Before migration 0033 is applied the review columns don't exist yet.
    if (error) ({ data, error } = await query(LEGACY_COLUMNS));
    if (error || !data || data.length === 0) return placeholderTestimonials;
    return (data as unknown as Partial<PublicRow>[]).map((row) =>
      mapRow({ rating: null, request_id: null, service_id: null, service_title: null, role: null, avatar_url: null, ...row } as PublicRow),
    );
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

/** Published verified reviews for one service. No placeholders: an empty list shows nothing. */
export async function getServiceReviews(serviceId: string): Promise<ReviewSummary> {
  const empty = { average: 0, count: 0, reviews: [] };
  if (!isSupabaseConfigured) return empty;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("testimonials")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .eq("service_id", serviceId)
      .not("request_id", "is", null)
      .order("sort_order", { ascending: true });
    if (error || !data) return empty;
    return summarize((data as PublicRow[]).map(mapRow));
  } catch {
    return empty;
  }
}
