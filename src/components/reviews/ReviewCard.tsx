import SmartImage from "@/components/media/SmartImage";
import Stars from "@/components/reviews/Stars";
import VerifiedBadge from "@/components/reviews/VerifiedBadge";
import type { Testimonial } from "@/lib/placeholder-data";

/** Quote + attribution. Verified reviews also show stars and what was commissioned. */
export function ReviewBody({ t, showService = true }: { t: Testimonial; showService?: boolean }) {
  return (
    <>
      <blockquote className="flex flex-col gap-4 text-body text-pretty text-ink">
        <span aria-hidden="true" className="block h-2 w-6 bg-accent" />
        {t.rating ? <Stars rating={t.rating} /> : null}
        <span className="whitespace-pre-line">{t.quote}</span>
      </blockquote>
      <figcaption className="flex flex-col gap-2">
        <span className="flex items-center gap-3">
          {t.avatarUrl && (
            <span className="relative h-9 w-9 shrink-0 overflow-hidden border border-line">
              <SmartImage src={t.avatarUrl} alt={t.name} sizes="36px" />
            </span>
          )}
          <span className="spec">
            {t.name}
            {t.role ? ` — ${t.role}` : ""}
          </span>
        </span>
        {t.verified && <VerifiedBadge serviceTitle={showService ? t.serviceTitle : undefined} />}
      </figcaption>
    </>
  );
}
