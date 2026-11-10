import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import ProjectGallery from "@/components/media/ProjectGallery";
import SmartImage from "@/components/media/SmartImage";
import Reveal from "@/components/motion/Reveal";
import ServiceOrderPanel from "@/components/services/ServiceOrderPanel";
import { ReviewBody } from "@/components/reviews/ReviewCard";
import Stars from "@/components/reviews/Stars";
import { getStorefrontService, getStorefrontServices } from "@/lib/data/services";
import { getServiceReviews } from "@/lib/data/testimonials";
import { startingPrice } from "@/lib/services/storefront";
import { SITE_URL } from "@/lib/site-url";

export async function generateStaticParams() {
  const services = await getStorefrontServices();
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getStorefrontService(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.description,
    openGraph: {
      title: service.title,
      description: service.description,
      ...(service.coverUrl && { images: [{ url: service.coverUrl, alt: service.title }] }),
    },
  };
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line text-body-lg text-pretty text-ink-muted">
            {p}
          </p>
        ))}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-line pt-8">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getStorefrontService(slug);
  if (!service) notFound();

  const reviews = await getServiceReviews(service.id);
  const from = startingPrice(service.packages);
  const hasSamples = service.samples.length > 0;

  return (
    <div className="container-page pb-[var(--space-section)] pt-10 sm:pt-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          description: service.description,
          provider: { "@type": "Person", name: "MJFIRD" },
          url: `${SITE_URL}/services/${service.slug}`,
          ...(from !== null && {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: from,
              highPrice: Math.max(...service.packages.map((p) => p.price)),
              offerCount: service.packages.length,
            },
          }),
          ...(reviews.count > 0 && {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: reviews.average,
              reviewCount: reviews.count,
              bestRating: 5,
            },
          }),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/services" className="spec text-ink-muted transition-colors hover:text-accent">
          ← All services
        </Link>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <Reveal as="header" className="flex flex-col gap-4">
            {service.category && <p className="eyebrow eyebrow-accent">{service.category}</p>}
            <h1 className="display-lg text-balance">{service.title}</h1>
            {service.description && (
              <p className="max-w-2xl text-body-lg text-pretty text-ink-muted">{service.description}</p>
            )}
          </Reveal>

          {hasSamples ? (
            <Reveal>
              <ProjectGallery images={service.samples} />
            </Reveal>
          ) : (
            service.coverUrl && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-raised-2">
                <SmartImage src={service.coverUrl} alt={service.title} priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
              </div>
            )
          )}

          {/* On phones the order panel sits here, right after the samples. */}
          <div className="lg:hidden">
            <ServiceOrderPanel service={service} rating={reviews.count > 0 ? { average: reviews.average, count: reviews.count } : undefined} />
          </div>

          {service.details && (
            <Section title="About this commission">
              <div className="flex max-w-2xl flex-col gap-4">
                <Paragraphs text={service.details} />
              </div>
            </Section>
          )}

          {(service.willDraw.length > 0 || service.wontDraw.length > 0) && (
            <Section title="What I will & won't do">
              <div className="grid gap-8 sm:grid-cols-2">
                {service.willDraw.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-body font-medium text-ink">Will do</h3>
                    <ul className="flex flex-col gap-2">
                      {service.willDraw.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-body-sm text-ink-muted">
                          <span aria-hidden="true" className="text-accent">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {service.wontDraw.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-body font-medium text-ink">Won&apos;t do</h3>
                    <ul className="flex flex-col gap-2">
                      {service.wontDraw.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-body-sm text-ink-muted">
                          <span aria-hidden="true" className="text-ink-faint">✕</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {reviews.count > 0 && (
            <section id="reviews" className="flex scroll-mt-28 flex-col gap-6 border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="eyebrow">Client reviews</h2>
                <p className="flex items-center gap-2 text-body-sm text-ink-muted">
                  <Stars rating={reviews.average} />
                  <span>
                    {reviews.average.toFixed(1)} · {reviews.count} verified review{reviews.count === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
              <div className="grid gap-x-10 border-b border-line sm:grid-cols-2">
                {reviews.reviews.map((t) => (
                  <figure key={t.id} className="flex flex-col justify-between gap-6 border-t border-line py-7">
                    <ReviewBody t={t} showService={false} />
                  </figure>
                ))}
              </div>
            </section>
          )}

          {service.faq.length > 0 && (
            <Section title="FAQ">
              <div className="flex flex-col border-b border-line">
                {service.faq.map((item) => (
                  <details key={item.q} className="group border-t border-line first:border-t-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-body text-ink [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span aria-hidden="true" className="font-mono text-ink-faint transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="whitespace-pre-line pb-5 text-body-sm text-pretty text-ink-muted">{item.a}</p>
                  </details>
                ))}
              </div>
            </Section>
          )}

          {service.terms && (
            <Section title="Terms of service">
              <p className="max-w-2xl whitespace-pre-line text-body-sm text-pretty text-ink-muted">{service.terms}</p>
            </Section>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--nav-h)+2rem)]">
            <ServiceOrderPanel service={service} rating={reviews.count > 0 ? { average: reviews.average, count: reviews.count } : undefined} />
          </div>
        </aside>
      </div>
    </div>
  );
}
