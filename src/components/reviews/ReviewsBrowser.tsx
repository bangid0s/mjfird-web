"use client";

import { useMemo, useState } from "react";
import FilterChips from "@/components/ui/FilterChips";
import { ReviewBody } from "@/components/reviews/ReviewCard";
import type { Testimonial } from "@/lib/placeholder-data";

const PAGE = 12;

// Fixed locale and zone so the server and browser print the same text.
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function monthOf(iso?: string): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : MONTH.format(ms);
}

/** All reviews, newest first, filterable by service, revealed a page at a time. */
export default function ReviewsBrowser({ reviews }: { reviews: Testimonial[] }) {
  const services = useMemo(
    () => [...new Set(reviews.map((r) => r.serviceTitle).filter((t): t is string => Boolean(t)))].sort(),
    [reviews],
  );
  const [service, setService] = useState("All");
  const [shown, setShown] = useState(PAGE);

  const visible = service === "All" ? reviews : reviews.filter((r) => r.serviceTitle === service);
  const page = visible.slice(0, shown);

  return (
    <div className="flex flex-col gap-10">
      {services.length > 1 && (
        <FilterChips
          options={services}
          label="Filter reviews by service"
          onChange={(next) => {
            setService(next);
            setShown(PAGE);
          }}
        />
      )}

      <ul className="grid border-t border-line sm:grid-cols-2">
        {page.map((t) => {
          const month = monthOf(t.postedAt);
          return (
            <li
              key={t.id ?? `${t.name}-${t.quote.slice(0, 24)}`}
              className="flex flex-col justify-between gap-8 border-b border-line py-9 sm:px-8 sm:py-10 sm:odd:border-r sm:odd:pl-0 sm:even:pr-0"
            >
              <figure className="flex flex-1 flex-col justify-between gap-8">
                <ReviewBody t={t} clamp />
              </figure>
              {month && <p className="mono-meta text-ink-faint">{month}</p>}
            </li>
          );
        })}
      </ul>

      {visible.length > shown && (
        <div>
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            data-cursor="view"
            className="label inline-flex items-center gap-3 border border-line px-5 py-3 transition-colors duration-[var(--duration-fast)] hover:border-ink hover:text-ink"
          >
            Show more
            <span className="mono-meta">({visible.length - shown} left)</span>
          </button>
        </div>
      )}
    </div>
  );
}
