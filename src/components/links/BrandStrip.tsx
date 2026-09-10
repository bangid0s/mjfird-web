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
    <section aria-label="Partners" className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6 lg:gap-4">
      {brands.map((brand, i) => {
        const content = (
          <>
            <span className="flex h-10 items-center justify-center">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  loading="lazy"
                  className="max-h-10 w-full object-contain"
                />
              ) : (
                <span className="font-display text-body-lg font-semibold tracking-[-0.02em] text-ink">
                  {brand.name}
                </span>
              )}
            </span>
            {brand.note && (
              <span className="line-clamp-2 text-center font-body text-label text-ink-faint">
                {brand.note}
              </span>
            )}
          </>
        );

        const classes =
          "flex flex-col items-center justify-center gap-2 rounded-2xl bg-bg-raised p-4 transition-colors duration-[var(--duration-fast)] hover:bg-bg-raised-2";

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
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-faint"
            >
              +
            </span>
            <span className="text-center font-body text-label leading-tight text-ink-faint">
              Your Brand
              <span className="block text-ink-faint/70">here</span>
            </span>
          </>
        );
        const classes =
          "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-4 transition-colors duration-[var(--duration-fast)] hover:border-accent hover:text-accent";

        return ctaUrl ? (
          <a key={`slot-${i}`} href={ctaUrl} className={classes}>
            {content}
          </a>
        ) : (
          <div key={`slot-${i}`} className={classes} aria-hidden="true">
            {content}
          </div>
        );
      })}
    </section>
  );
}
