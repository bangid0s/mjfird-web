import Link from "next/link";
import Hero from "@/components/hero/Hero";
import CommissionMenu from "@/components/home/CommissionMenu";
import HomeFaq from "@/components/home/HomeFaq";
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
import ProcessSteps from "@/components/services/ProcessSteps";
import RetainerBand from "@/components/services/RetainerBand";
import {
  DEFAULT_HERO_HEADLINE,
  commissionStatus,
  heroFacts,
  heroMode,
  homeFaq,
  numberSections,
  pickWallItems,
  processAssurances,
} from "@/lib/home";
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
  // Four, not six: the commissions lead this page now, and the projects are
  // the way in for the second audience.
  const featured = projects.filter((p) => p.featured).slice(0, 4);
  const faq = homeFaq(settings.servicesFaq);
  const assurances = processAssurances(services);
  const number = numberSections({
    menu: services.length > 0,
    process: settings.processSteps.length > 0,
    faq: faq.length > 0,
    work: featured.length > 0,
    testimonials: testimonials.length > 0,
  });

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
      {number.menu > 0 && (
        <SectionBand id="commissions">
          <SectionHeader
            index={number.menu}
            eyebrow={settings.servicesSectionEyebrow}
            title={settings.servicesSectionTitle}
            action={<MoreLink href="/services">All services</MoreLink>}
          />
          <CommissionMenu services={services} gallery={gallery} />
        </SectionBand>
      )}

      {/* How a commission runs — the flipped sheet, so it reads as a pause between the two halves. */}
      {number.process > 0 && (
        <SectionBand tone="invert" id="process">
          <SectionHeader
            index={number.process}
            eyebrow={settings.processSectionEyebrow}
            title={settings.processSectionTitle}
          />
          <ProcessSteps steps={settings.processSteps} dense />
          <ul className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:mt-12 sm:flex-row sm:flex-wrap sm:gap-x-10">
            {assurances.map((line) => (
              <li key={line} className="flex items-center gap-3 text-body-sm text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-accent" />
                {line}
              </li>
            ))}
          </ul>
        </SectionBand>
      )}

      <HomeFaq index={number.faq} items={faq} />

      {/* From here down the page speaks to studios and brands: projects, the retainer, their words. */}
      {number.work > 0 && (
        <SectionBand id="work">
          <SectionHeader
            index={number.work}
            eyebrow={settings.workSectionEyebrow}
            title={settings.workSectionTitle}
            action={<MoreLink href="/work">All work</MoreLink>}
          />
          <FeaturedWork projects={featured} />
        </SectionBand>
      )}

      {/* The one accent band on the page. */}
      <RetainerBand settings={settings} />

      {number.testimonials > 0 && (
        <SectionBand>
          <SectionHeader
            index={number.testimonials}
            eyebrow={settings.testimonialsSectionEyebrow}
            title={settings.testimonialsSectionTitle}
          />
          <Testimonials items={testimonials} limit={2} />
        </SectionBand>
      )}
    </>
  );
}
