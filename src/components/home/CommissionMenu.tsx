import Link from "next/link";
import SampleStrip from "@/components/home/SampleStrip";
import Reveal from "@/components/motion/Reveal";
import AvailabilityBadge from "@/components/services/AvailabilityBadge";
import MagneticButton from "@/components/ui/MagneticButton";
import type { GalleryItem } from "@/lib/data/gallery";
import type { StorefrontService } from "@/lib/data/services";
import { cn } from "@/lib/cn";
import { fastestDelivery, orderLabel, packageLines, serviceSamples } from "@/lib/home";
import { mediaThumbnail } from "@/lib/media";
import { effectiveAvailability, formatUSD, startingPrice } from "@/lib/services/storefront";

/*
  The menu: every published commission as one row, with the three things a
  buyer weighs side by side — what it costs, what it looks like, how to order.
  The service cards this replaces on the home page showed one cover and a
  "from" price; the packages and the samples were a click away.
*/
export default function CommissionMenu({
  services,
  gallery,
}: {
  services: StorefrontService[];
  gallery: GalleryItem[];
}) {
  return (
    <div className="flex flex-col border-t border-line">
      {services.map((service) => (
        <MenuRow key={service.id} service={service} samples={serviceSamples(service, gallery)} />
      ))}
    </div>
  );
}

function MenuRow({ service, samples }: { service: StorefrontService; samples: GalleryItem[] }) {
  const href = `/services/${service.slug}`;
  const status = effectiveAvailability(service.availability, service.slotsTotal, service.slotsTaken);
  const from = startingPrice(service.packages);
  const days = fastestDelivery(service.packages);
  const { lines, more } = packageLines(service.packages);
  // One sample is not a strip: show the service's cover instead.
  const showStrip = samples.length >= 2;
  const showCover = !showStrip && Boolean(service.coverUrl);
  const hasMedia = showStrip || showCover;

  return (
    /*
      Three blocks in one source order — heading, artwork, price — so a phone
      reads title, samples, then what it costs. From `lg` the artwork moves to
      a right-hand column spanning both text blocks. The single column is
      `minmax(0, 1fr)` and every block may shrink: without that the sample
      strip's own width would stretch the row past the screen.
    */
    <Reveal
      as="article"
      className="grid grid-cols-1 gap-y-5 border-b border-line py-9 lg:grid-cols-12 lg:gap-x-12 lg:py-14"
    >
      <div className={cn("flex min-w-0 flex-col gap-4 lg:gap-5", hasMedia ? "lg:col-span-5 xl:col-span-4" : "lg:col-span-12")}>
        <div className="flex flex-wrap items-center gap-3">
          <AvailabilityBadge
            availability={service.availability}
            slotsTotal={service.slotsTotal}
            slotsTaken={service.slotsTaken}
          />
          {service.category && <span className="mono-meta">{service.category}</span>}
        </div>

        <h3 className="display-md">
          <Link
            href={href}
            data-cursor="view"
            className="transition-colors duration-[var(--duration-fast)] hover:text-accent-strong"
          >
            {service.title}
          </Link>
        </h3>

        {/* The title already says what it is; on a phone the samples say the rest. */}
        {service.description && (
          <p className="hidden max-w-md text-body text-pretty text-ink-muted sm:block">{service.description}</p>
        )}
      </div>

      {showStrip && (
        <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 xl:col-span-8 xl:col-start-5">
          <SampleStrip items={samples} label={service.title} />
        </div>
      )}

      {showCover && (
        <Link
          href={href}
          data-cursor="view"
          aria-label={`${service.title}: see the details`}
          className="block min-w-0 self-start border border-line bg-bg-raised-2 lg:col-span-6 lg:col-start-7 lg:row-span-2"
        >
          {/* The cover at its own shape: covers come in more than one ratio,
              and a fixed frame cut the ends off the wide ones. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaThumbnail(service.coverUrl!)}
            alt=""
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </Link>
      )}

      <div className={cn("flex min-w-0 flex-col gap-5", hasMedia ? "lg:col-span-5 lg:col-start-1 xl:col-span-4" : "lg:col-span-12")}>
        {lines.length > 0 && (
          <>
            {/* Narrow: one line of prices. Wider: the same prices as a list. */}
            <p className="text-body-sm text-pretty text-ink sm:hidden">
              {lines.map((line, i) => (
                <span key={line.name}>
                  {i > 0 && <span className="text-ink-faint"> · </span>}
                  {line.name} <span className="font-medium tabular-nums">{line.price}</span>
                </span>
              ))}
              {more > 0 && <span className="text-ink-faint"> · +{more} more</span>}
            </p>
            <div className="hidden max-w-sm sm:block">
              <dl className="border-t border-line">
                {lines.map((line) => (
                  <div key={line.name} className="flex items-baseline justify-between gap-6 border-b border-line py-2.5">
                    <dt className="text-body-sm text-ink">{line.name}</dt>
                    <dd className="text-body-sm font-medium tabular-nums text-ink">{line.price}</dd>
                  </div>
                ))}
              </dl>
              {more > 0 && <p className="label pt-2.5">+{more} more</p>}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <MagneticButton href={href} arrow cursorLabel="view">
            {orderLabel(status)}
          </MagneticButton>
          <p className="text-body text-ink">
            {from !== null ? (
              // Narrow screens print every package price on the line above,
              // so "From" would only repeat the first of them.
              <span className={lines.length > 0 ? "max-sm:hidden" : undefined}>
                <span className="text-ink-faint">From </span>
                {formatUSD(from)}
                {days !== null && <span className="text-ink-faint"> · </span>}
              </span>
            ) : (
              <span className="text-ink-muted">Quote on request{days !== null && " · "}</span>
            )}
            {days !== null && <span className="text-ink-faint">{days}+ days</span>}
          </p>
          {service.hasGalleryWorks && (
            <Link
              href={`/gallery?service=${encodeURIComponent(service.slug)}`}
              className="label underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-ink"
            >
              See works
            </Link>
          )}
        </div>
      </div>
    </Reveal>
  );
}
