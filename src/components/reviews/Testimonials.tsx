import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import { ReviewAttribution, ReviewBody } from "@/components/reviews/ReviewCard";
import Stars from "@/components/reviews/Stars";
import type { Testimonial } from "@/lib/placeholder-data";

/*
  One voice leads, at reading size; up to four more follow as short cards. Six
  long quotes at equal weight read as a wall and nobody finishes any of them.
  Items arrive pinned-first, then newest first; the rest live on /reviews.
*/
export default function Testimonials({ items, showAllLink = true }: { items: Testimonial[]; showAllLink?: boolean }) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  const cards = rest.slice(0, 4);

  return (
    <div className="flex flex-col">
      <Reveal
        as="figure"
        className="grid gap-8 border-t border-line py-10 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-16 lg:py-14"
      >
        <blockquote className="flex flex-col gap-5">
          <span aria-hidden="true" className="block h-2 w-6 bg-accent" />
          {lead.rating ? <Stars rating={lead.rating} /> : null}
          <p className="display-sm max-w-3xl whitespace-pre-line font-normal text-pretty">{lead.quote}</p>
        </blockquote>
        <ReviewAttribution t={lead} size="h-12 w-12" />
      </Reveal>

      {cards.length > 0 && (
        <div className="grid border-t border-line sm:grid-cols-2">
          {cards.map((t, i) => (
            <Reveal
              key={t.id ?? t.name}
              delay={(i % 2) * 70}
              as="figure"
              className="flex flex-col justify-between gap-8 border-b border-line py-9 sm:px-8 sm:py-10 sm:odd:border-r sm:odd:pl-0 sm:even:pr-0"
            >
              <ReviewBody t={t} clamp />
            </Reveal>
          ))}
        </div>
      )}

      {showAllLink && (
        <Reveal className="flex justify-start pt-10">
          <Link
            href="/reviews"
            data-cursor="view"
            className="label group inline-flex items-center gap-3 border border-line px-5 py-3 transition-colors duration-[var(--duration-fast)] hover:border-ink hover:text-ink"
          >
            See all reviews
            <span className="mono-meta">({items.length})</span>
            <span
              aria-hidden="true"
              className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </Reveal>
      )}
    </div>
  );
}
