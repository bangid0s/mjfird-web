import Link from "next/link";
import Hero from "@/components/hero/Hero";
import CommissionMenu from "@/components/home/CommissionMenu";
import HomeHero from "@/components/home/HomeHero";
import SectionHeader from "@/components/ui/SectionHeader";
import FeaturedWork from "@/components/work/FeaturedWork";
import SectionBand from "@/components/layout/SectionBand";
import { getGalleryItems } from "@/lib/data/gallery";
import { getProjects } from "@/lib/data/projects";
import { getStorefrontServices } from "@/lib/data/services";
import { getTestimonials } from "@/lib/data/testimonials";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";
import JsonLd from "@/components/seo/JsonLd";
import Testimonials from "@/components/reviews/Testimonials";
import RetainerBand from "@/components/services/RetainerBand";
import { DEFAULT_HERO_HEADLINE, commissionStatus, heroFacts, heroMode, pickWallItems } from "@/lib/home";
import { SITE_URL } from "@/lib/site-url";

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
  const [projects, services, testimonials, profile, settings, gallery] = await Promise.all([
    getProjects(),
    getStorefrontServices(),
    getTestimonials(),
    getProfile(),
    getSiteSettings(),
    getGalleryItems(),
  ]);
  const wall = pickWallItems(gallery, services.map((service) => service.slug));
  const hero = heroMode(settings.heroStyle, wall.length);
  const featured = projects.filter((p) => p.featured);

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
      {hero === "wall" ? (
        <HomeHero
          eyebrow={settings.heroEyebrow}
          headline={settings.heroHeadline || DEFAULT_HERO_HEADLINE}
          intro={settings.heroIntro}
          ctaPrimary={settings.heroCtaPrimary}
          ctaSecondary={settings.heroCtaSecondary}
          ctaPrimaryHref={settings.heroCtaPrimaryUrl}
          ctaSecondaryHref={settings.heroCtaSecondaryUrl}
          status={commissionStatus(services)}
          facts={heroFacts(services)}
          stats={settings.stats}
          proofNote={settings.heroProofNote}
          wall={wall}
        />
      ) : (
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
          ctaPrimaryHref={settings.heroCtaPrimaryUrl}
          ctaSecondaryHref={settings.heroCtaSecondaryUrl}
          edgeLabel={settings.siteTitle}
          headline={settings.heroHeadline}
          stats={settings.stats}
          proofNote={settings.heroProofNote}
        />
      )}

      {/* The menu: every commission with its price, its samples and its order button. */}
      {services.length > 0 && (
        <SectionBand id="commissions">
          <SectionHeader
            index={1}
            eyebrow={settings.servicesSectionEyebrow}
            title={settings.servicesSectionTitle}
            action={<MoreLink href="/services">All services</MoreLink>}
          />
          <CommissionMenu services={services} gallery={gallery} />
        </SectionBand>
      )}

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
