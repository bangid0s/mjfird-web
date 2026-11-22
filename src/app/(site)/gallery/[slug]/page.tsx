import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FlowImage from "@/components/media/FlowImage";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/motion/Reveal";
import Stars from "@/components/reviews/Stars";
import VerifiedBadge from "@/components/reviews/VerifiedBadge";
import JsonLd from "@/components/seo/JsonLd";
import { getGalleryItems } from "@/lib/data/gallery";
import { getStorefrontServices } from "@/lib/data/services";
import { formatUSD, startingPrice } from "@/lib/services/storefront";
import { galleryDescription, galleryJsonLd, relatedItems } from "@/lib/gallery-page";
import { isVideoFile, isYouTubeUrl, mediaThumbnail } from "@/lib/media";
import { projectImageLabel } from "@/lib/alt-text";
import { SITE_URL } from "@/lib/site-url";

/*
  One gallery piece, on its own address. Two jobs: give Google Images a page
  that names the artwork (title, description, licensing schema), and give a
  visitor who likes it a one-click way to order the same kind of piece.
*/

export async function generateStaticParams() {
  const items = await getGalleryItems();
  return items.filter((item) => item.slug).map((item) => ({ slug: item.slug! }));
}

async function findItem(slug: string) {
  const items = await getGalleryItems();
  const item = items.find((i) => i.slug === slug);
  return { item, items };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { item } = await findItem(slug);
  if (!item) return {};
  const title = item.title || "Artwork";
  const description = galleryDescription(item);
  const isImage = !isVideoFile(item.imageUrl) && !isYouTubeUrl(item.imageUrl);
  return {
    title,
    description,
    alternates: { canonical: `/gallery/${item.slug}` },
    openGraph: {
      title,
      description,
      ...(isImage && { images: [{ url: item.imageUrl, alt: title }] }),
    },
  };
}

function formatMonth(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function GalleryItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ item, items }, services] = await Promise.all([findItem(slug), getStorefrontServices()]);
  if (!item) notFound();

  const title = item.title || "Artwork";
  const alt = projectImageLabel({ title, category: item.services[0]?.title || item.tags[0] });
  const paragraphs = item.caption.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean);
  const offers = item.services.flatMap((link) => services.find((s) => s.slug === link.slug) ?? []);
  const related = relatedItems(item, items);
  const external = item.linkUrl && /^https?:\/\//.test(item.linkUrl);

  return (
    <div>
      <JsonLd data={galleryJsonLd(item, SITE_URL)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Gallery", item: `${SITE_URL}/gallery` },
            { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/gallery/${item.slug}` },
          ],
        }}
      />

      <div className="container-page pb-[var(--space-section)] pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 font-mono text-label text-ink-faint">
            <li>
              <Link href="/gallery" className="transition-colors hover:text-ink">
                Gallery
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="truncate text-ink-muted">
              {title}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          {/* The artwork at its own proportions: nothing cropped, nothing on top. */}
          <Reveal className="self-start overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-raised">
            {isVideoFile(item.imageUrl) ? (
              <video src={item.imageUrl} controls playsInline className="block h-auto w-full" />
            ) : (
              <FlowImage
                src={mediaThumbnail(item.imageUrl)}
                alt={alt}
                sizes="(min-width: 1024px) 58vw, 100vw"
                priority
                className="block h-auto w-full"
              />
            )}
          </Reveal>

          <Reveal delay={80} className="flex flex-col gap-8 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
            <div className="flex flex-col gap-4">
              {item.tags.length > 0 && <p className="eyebrow eyebrow-accent">{item.tags.join(" · ")}</p>}
              <h1 className="display-md">{title}</h1>
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="text-body-lg text-pretty text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 text-body-sm">
              {/* A client is only ever named through their own public review. */}
              {(item.clientName || item.fromCommission) && (
                <div className="flex flex-col gap-1">
                  <dt className="text-ink-faint">Made for</dt>
                  <dd className="text-ink">{item.clientName || "A commission client"}</dd>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <dt className="text-ink-faint">Artist</dt>
                <dd>
                  <Link href="/about" className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent">
                    M.J. Fird
                  </Link>
                </dd>
              </div>
              {item.publishedAt && (
                <div className="flex flex-col gap-1">
                  <dt className="text-ink-faint">Added</dt>
                  <dd className="text-ink">{formatMonth(item.publishedAt)}</dd>
                </div>
              )}
            </dl>

            {/* The point of the page for a buyer: the same kind of piece, priced. */}
            <section aria-labelledby="order-similar" className="flex flex-col gap-4 border border-line p-5 sm:p-6">
              <h2 id="order-similar" className="label text-ink">
                Want one like this?
              </h2>
              {offers.length > 0 ? (
                offers.map((service) => {
                  const from = startingPrice(service.packages);
                  const days = service.packages.map((p) => p.delivery_days).filter((d) => d > 0);
                  return (
                    <div key={service.id} className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <Link href={`/services/${service.slug}`} className="display-sm hover:text-accent-strong">
                          {service.title}
                        </Link>
                        <span className="text-body text-ink">
                          {from !== null ? (
                            <>
                              <span className="text-ink-faint">From </span>
                              {formatUSD(from)}
                            </>
                          ) : (
                            <span className="text-ink-muted">Quote on request</span>
                          )}
                          {days.length > 0 && (
                            <span className="text-ink-faint"> · {Math.min(...days)}+ days</span>
                          )}
                        </span>
                      </div>
                      {/* Counted by the site-wide ClickTracker. */}
                      <span
                        className="self-start"
                        data-track="select_item"
                        data-track-item-id={service.slug}
                        data-track-from={item.slug}
                      >
                        <MagneticButton href={`/services/${service.slug}`} arrow>
                          Order similar
                        </MagneticButton>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-body-sm text-pretty text-ink-muted">
                    Tell me what you have in mind, or browse the commission menu.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <MagneticButton href="/services" arrow>
                      See commissions
                    </MagneticButton>
                    <MagneticButton href="/contact" variant="secondary">
                      Ask about it
                    </MagneticButton>
                  </div>
                </div>
              )}
            </section>

            {item.review && (
              <figure className="flex flex-col gap-3 border-l-2 border-accent pl-5">
                {item.review.rating !== undefined && <Stars rating={item.review.rating} />}
                <blockquote className="text-body text-pretty text-ink">&ldquo;{item.review.quote}&rdquo;</blockquote>
                <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink-muted">
                  <span>
                    {item.review.name}
                    {item.review.role && `, ${item.review.role}`}
                  </span>
                  {item.review.verified && <VerifiedBadge serviceTitle={item.services[0]?.title} />}
                </figcaption>
              </figure>
            )}

            {item.linkUrl && (
              <a
                href={item.linkUrl}
                {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                className="spec self-start text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-accent"
              >
                {external ? "See the full project ↗" : "See the full project →"}
              </a>
            )}
          </Reveal>
        </div>
      </div>

      {related.length > 0 && (
        <div className="border-t border-line">
          <div className="container-page py-[var(--space-section)]">
            <div className="mb-10 flex items-end justify-between gap-4">
              <h2 className="display-sm">More from the gallery</h2>
              <Link href="/gallery" className="label hover:text-ink">
                All work →
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {related.map((other) => (
                <li key={other.id}>
                  <Link href={`/gallery/${other.slug}`} className="group flex flex-col gap-2.5">
                    <span className="relative block aspect-[4/5] overflow-hidden border border-line bg-bg-raised transition-colors group-hover:border-ink">
                      <FlowImage
                        src={mediaThumbnail(other.imageUrl)}
                        alt={projectImageLabel({ title: other.title || "Artwork", category: other.tags[0] })}
                        sizes="(min-width: 1024px) 22vw, 46vw"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="truncate text-body-sm font-medium text-ink group-hover:text-accent-strong">
                      {other.title || "Artwork"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
