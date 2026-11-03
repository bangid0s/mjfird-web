import type { LinkBrand } from "@/lib/data/site-settings";

// Partner / affiliate logos, followed by dashed "your brand here" slots that
// double as a sponsorship call to action.
export default function BrandStrip({
  brands,
  slots,
  ctaUrl,
}: {
  brands: LinkBrand[];
  slots: number;
  ctaUrl: string;
}) {
  if (brands.length === 0 && slots === 0) return null;

  const openSlots = Array.from({ length: slots });

  return (
    <section aria-labelledby="links-partners" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="links-partners"
          className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint"
        >
          Partners
        </h2>
        {ctaUrl && slots > 0 && (
          <a
            href={ctaUrl}
            className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
          >
            Sponsor a slot →
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-6">
        {brands.map((brand, i) => {
          const content = (
            <>
              <span className="flex h-9 items-center justify-center">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    loading="lazy"
                    className="max-h-9 w-full object-contain opacity-80 grayscale transition-[filter,opacity] duration-[var(--duration-base)] group-hover:opacity-100 group-hover:grayscale-0"
                  />
                ) : (
                  <span className="font-display text-body font-semibold tracking-[-0.02em] text-ink">
                    {brand.name}
                  </span>
                )}
              </span>
              {brand.note && (
                <span className="line-clamp-2 text-center font-body text-[11px] leading-tight text-ink-faint">
                  {brand.note}
                </span>
              )}
            </>
          );

          const classes =
            "group flex min-h-24 flex-col items-center justify-center gap-2 border border-line bg-bg-raised p-3 transition-colors duration-[var(--duration-fast)] hover:border-ink/40";

          return brand.url ? (
            <a
              key={`${brand.name}-${i}`}
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={classes}
            >
              {content}
            </a>
          ) : (
            <div key={`${brand.name}-${i}`} className={classes}>
              {content}
            </div>
          );
        })}

        {openSlots.map((_, i) => {
          const content = (
            <>
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center border border-dashed border-line-strong text-sm text-ink-faint transition-colors duration-[var(--duration-fast)] group-hover:border-accent group-hover:text-accent"
              >
                +
              </span>
              <span className="text-center font-mono text-[10px] uppercase leading-tight tracking-[0.15em] text-ink-faint">
                Your brand
              </span>
            </>
          );
          const classes =
            "group flex min-h-24 flex-col items-center justify-center gap-2 border border-dashed border-line p-3 transition-colors duration-[var(--duration-fast)] hover:border-accent";

          return ctaUrl ? (
            <a key={`slot-${i}`} href={ctaUrl} className={classes} aria-label="Sponsor this slot">
              {content}
            </a>
          ) : (
            <div key={`slot-${i}`} className={classes} aria-hidden="true">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
