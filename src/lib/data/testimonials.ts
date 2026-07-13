import { createPublicClient } from "@/lib/supabase/public";
import { testimonials as placeholderTestimonials, type Testimonial } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "./config";
import type { TestimonialRow } from "@/lib/supabase/types";

function mapRow(row: TestimonialRow): Testimonial {
  return {
    quote: row.quote,
    name: row.name,
    role: row.role ?? "",
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export async function getTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured) return placeholderTestimonials;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderTestimonials;
    return data.map(mapRow);
  } catch {
    return placeholderTestimonials;
  }
}
