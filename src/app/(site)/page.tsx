import Link from "next/link";
import Hero from "@/components/hero/Hero";
import SectionHeader from "@/components/ui/SectionHeader";
import FeaturedWork from "@/components/work/FeaturedWork";
import Reveal from "@/components/motion/Reveal";
import SectionBand, { type SectionTone } from "@/components/layout/SectionBand";
import { getProjects } from "@/lib/data/projects";
import { getStorefrontServices } from "@/lib/data/services";
import { getTestimonials } from "@/lib/data/testimonials";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";
import JsonLd from "@/components/seo/JsonLd";
import Testimonials from "@/components/reviews/Testimonials";
import ServiceCard from "@/components/services/ServiceCard";
import RetainerBand from "@/components/services/RetainerBand";
import { SITE_URL } from "@/lib/site-url";
import { cn } from "@/lib/cn";

/*
  Which band carries what. A band that wants to stand apart without colour
  flips the sheet; the accent fill is spent once, on the retainer band. One
  line, because this is the kind of decision that gets revisited.
*/
const SERVICES_TONE: SectionTone = "invert";

// Small shared link, used as the trailing control on two section headers.
function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-cursor="view"
      className="label group inline-flex items-center gap-2 transition-colors duration-[var(--duration-fast)] hover:text-ink"
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}

export default async function Home() {
  const [projects, services, testimonials, profile, settings] = await Promise.all([
    getProjects(),
    getStorefrontServices(),
    getTestimonials(),
    getProfile(),
    getSiteSettings(),
  ]);
  const featured = projects.filter((p) => p.featured);
  const homeServices = services.slice(0, 3);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile.name,
          description: profile.tagline,
          url: SITE_URL,
          sameAs: profile.socials.map((s) => s.url),
        }}
      />
      <Hero
        mediaType={settings.heroMediaType}
        mediaUrl={settings.heroMediaUrl ?? ""}
        slides={settings.heroSlides}
        animation={settings.heroAnimation}
        slideDuration={settings.heroSlideDuration}
        eyebrow={settings.heroEyebrow}
        intro={settings.heroIntro}
        ctaPrimary={settings.heroCtaPrimary}
        ctaSecondary={settings.heroCtaSecondary}
        edgeLabel={settings.siteTitle}
        headline={settings.heroHeadline}
        stats={settings.stats}
        proofNote={settings.heroProofNote}
      />

      {/* Featured work — deliberately untinted: the artwork supplies the colour. */}
      {featured.length > 0 && (
        <SectionBand id="work">
          <SectionHeader
            index={1}
            eyebrow={settings.workSectionEyebrow}
            title={settings.workSectionTitle}
            action={<MoreLink href="/work">All work</MoreLink>}
          />
          <FeaturedWork projects={featured} />
        </SectionBand>
      )}

      {/* Services — the real storefront cards: image, price, turnaround. */}
      {homeServices.length > 0 && (
        <SectionBand tone={SERVICES_TONE}>
          <SectionHeader
            index={2}
            eyebrow={settings.servicesSectionEyebrow}
            title={settings.servicesSectionTitle}
            action={<MoreLink href="/services">All services</MoreLink>}
          />
          {/* Two services fill the row as a pair rather than leaving a third column empty. */}
          <div
            className={cn(
              "grid gap-x-8 gap-y-14 sm:grid-cols-2",
              homeServices.length >= 3 && "lg:grid-cols-3",
            )}
          >
            {homeServices.map((service, i) => (
              <Reveal key={service.id} delay={i * 70}>
                <ServiceCard service={service} headingLevel="h3" />
              </Reveal>
            ))}
          </div>
        </SectionBand>
      )}

      {/* The one accent band on the page. */}
      <RetainerBand settings={settings} />

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <SectionBand>
          <SectionHeader
            index={3}
            eyebrow={settings.testimonialsSectionEyebrow}
            title={settings.testimonialsSectionTitle}
          />
          <Testimonials items={testimonials} />
        </SectionBand>
      )}
    </>
  );
}
