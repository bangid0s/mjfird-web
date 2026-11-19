import type { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import Stars from "@/components/reviews/Stars";
import ReviewsBrowser from "@/components/reviews/ReviewsBrowser";
import { getAllReviews, summarize } from "@/lib/data/testimonials";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Client reviews",
  description: "What clients say after a commission, newest first.",
};

export default async function ReviewsPage() {
  const [reviews, settings] = await Promise.all([getAllReviews(), getSiteSettings()]);
  const { average, count } = summarize(reviews);

  return (
    <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <SectionHeader
        index={1}
        eyebrow={settings.testimonialsSectionEyebrow}
        title="Client reviews"
        description="Every review, newest first. Verified reviews were written by clients from a completed commission on this site."
        action={
          count > 0 ? (
            <p className="flex items-center gap-3">
              <Stars rating={average} />
              <span className="mono-meta">
                {average.toFixed(1)} · {count} verified
              </span>
            </p>
          ) : reviews.length > 0 ? (
            <p className="mono-meta">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </p>
          ) : undefined
        }
      />

      {reviews.length === 0 ? (
        <p className="border border-dashed border-line px-6 py-14 text-center text-body-sm text-ink-muted">
          No reviews yet.
        </p>
      ) : (
        <ReviewsBrowser reviews={reviews} />
      )}

      <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-8">
        <p className="text-body text-ink-muted">Want to be next?</p>
        <Link
          href="/services"
          data-cursor="view"
          className="label group inline-flex items-center gap-2 transition-colors duration-[var(--duration-fast)] hover:text-ink"
        >
          Commission me
          <span aria-hidden="true" className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
