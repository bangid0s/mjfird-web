import Link from "next/link";
import SmartImage from "@/components/media/SmartImage";
import AvailabilityBadge from "@/components/services/AvailabilityBadge";
import type { StorefrontService } from "@/lib/data/services";
import { formatUSD, startingPrice } from "@/lib/services/storefront";

export default function ServiceCard({
  service,
  priority = false,
  headingLevel: Heading = "h2",
}: {
  service: StorefrontService;
  priority?: boolean;
  /** "h3" where the card sits under a section heading, as on the homepage. */
  headingLevel?: "h2" | "h3";
}) {
  const from = startingPrice(service.packages);
  const fastest = service.packages.length
    ? Math.min(...service.packages.map((p) => p.delivery_days).filter((d) => d > 0))
    : null;

  // One card, two destinations: the title's link is stretched over the whole
  // card (so any click still opens the service), and "See works" sits above it
  // and goes to the gallery filtered to this commission. Links can't nest.
  return (
    <article data-cursor="view" className="group relative flex flex-col gap-5">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-raised-2 transition-colors duration-[var(--duration-fast)] group-hover:border-line-strong">
        {service.coverUrl ? (
          <SmartImage
            src={service.coverUrl}
            alt={service.title}
            priority={priority}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 100vw"
            className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-raised to-bg-raised-2 transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]">
            <span className="eyebrow">{service.category || "Commission"}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <AvailabilityBadge
            availability={service.availability}
            slotsTotal={service.slotsTotal}
            slotsTaken={service.slotsTaken}
          />
          {service.category && <span className="mono-meta">{service.category}</span>}
        </div>
        <Heading className="display-sm transition-colors duration-[var(--duration-fast)] group-hover:text-accent-strong">
          <Link
            href={`/services/${service.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-accent"
          >
            {service.title}
          </Link>
        </Heading>
        {service.description && (
          <p className="text-body-sm text-pretty text-ink-muted">{service.description}</p>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <span className="text-body text-ink">
            {from !== null ? (
              <>
                <span className="text-ink-faint">From </span>
                {formatUSD(from)}
              </>
            ) : (
              <span className="text-ink-muted">Quote on request</span>
            )}
          </span>
          {fastest !== null && Number.isFinite(fastest) && (
            <span className="label">{fastest}+ days</span>
          )}
        </div>
        {service.hasGalleryWorks && (
          <Link
            href={`/gallery?service=${encodeURIComponent(service.slug)}`}
            className="spec relative z-10 self-start text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent"
          >
            See works →
          </Link>
        )}
      </div>
    </article>
  );
}
