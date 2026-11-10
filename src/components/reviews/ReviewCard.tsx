import ClampedQuote from "@/components/reviews/ClampedQuote";
import ReviewAvatar from "@/components/reviews/ReviewAvatar";
import Stars from "@/components/reviews/Stars";
import VerifiedBadge from "@/components/reviews/VerifiedBadge";
import type { Testimonial } from "@/lib/placeholder-data";

/** Who said it. Always carries a mark: the portrait, or initials when there is none. */
export function ReviewAttribution({
  t,
  showService = true,
  size,
}: {
  t: Testimonial;
  showService?: boolean;
  size?: string;
}) {
  return (
    <figcaption className="flex flex-col gap-2.5">
      <span className="flex items-center gap-3">
        <ReviewAvatar src={t.avatarUrl} name={t.name} size={size} />
        <span className="flex min-w-0 flex-col">
          <span className="text-body-sm font-medium text-ink">{t.name}</span>
          {t.role && <span className="text-body-sm text-ink-muted">{t.role}</span>}
        </span>
      </span>
      {t.verified && <VerifiedBadge serviceTitle={showService ? t.serviceTitle : undefined} />}
    </figcaption>
  );
}

/** Quote + attribution. Verified reviews also show stars and what was commissioned. */
export function ReviewBody({
  t,
  showService = true,
  clamp = false,
}: {
  t: Testimonial;
  showService?: boolean;
  /** Cut long quotes to four lines with a "Read more" toggle. */
  clamp?: boolean;
}) {
  return (
    <>
      <blockquote className="flex flex-col gap-4 text-body text-pretty text-ink">
        <span aria-hidden="true" className="block h-2 w-6 bg-accent" />
        {t.rating ? <Stars rating={t.rating} /> : null}
        {clamp ? <ClampedQuote text={t.quote} /> : <span className="whitespace-pre-line">{t.quote}</span>}
      </blockquote>
      <ReviewAttribution t={t} showService={showService} />
    </>
  );
}
