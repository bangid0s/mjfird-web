import Link from "next/link";
import Hero from "@/components/hero/Hero";
import SectionHeader from "@/components/ui/SectionHeader";
import FeaturedWork from "@/components/work/FeaturedWork";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Reveal from "@/components/motion/Reveal";
import SectionBand, { type SectionTone } from "@/components/layout/SectionBand";
import { getProjects } from "@/lib/data/projects";
import { getServices } from "@/lib/data/services";
import { getTestimonials } from "@/lib/data/testimonials";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";
import JsonLd from "@/components/seo/JsonLd";
import { ReviewBody } from "@/components/reviews/ReviewCard";
import { SITE_URL } from "@/lib/site-url";

/*
  Which band carries what. A coloured band is filled with the accent; a band
  that wants to stand apart without colour flips the sheet instead. Both are one
  line, because this is the kind of decision that gets revisited.
*/
const STATS_TONE: SectionTone = "accent";
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
    getServices(),
    getTestimonials(),
    getProfile(),
    getSiteSettings(),
  ]);
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

      {/* Stats */}
      <SectionBand tone={STATS_TONE} size="compact">
        <div className="grid grid-cols-2 gap-y-10 sm:grid-cols-4">
          {settings.stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 60}>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} label={stat.label} />
            </Reveal>
          ))}
        </div>
      </SectionBand>

      {/* Services — hairline compartments, not floating cards. */}
      <SectionBand tone={SERVICES_TONE}>
        <SectionHeader
          index={2}
          eyebrow={settings.servicesSectionEyebrow}
          title={settings.servicesSectionTitle}
          action={<MoreLink href="/services">How I work</MoreLink>}
        />
        <div className="grid border-t border-line md:grid-cols-3">
          {services.map((service, i) => (
            <Reveal
              key={service.title}
              delay={i * 70}
              className="flex flex-col gap-5 border-b border-line py-9 md:border-r md:px-8 md:py-10 md:last:border-r-0 md:[&:first-child]:pl-0 md:[&:last-child]:pr-0"
            >
              <span className="mono-meta text-ink">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display-sm">{service.title}</h3>
              <p className="text-body-sm text-pretty text-ink-muted">{service.description}</p>
              <ul className="mt-auto flex flex-col gap-2 pt-4">
                {service.deliverables.map((d) => (
                  <li key={d} className="spec flex items-start gap-2.5">
                    <span aria-hidden="true" className="mt-[0.5em] h-1 w-1 shrink-0 bg-accent" />
                    {d}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </SectionBand>

      {/* Testimonials */}
      <SectionBand>
        <SectionHeader
          index={3}
          eyebrow={settings.testimonialsSectionEyebrow}
          title={settings.testimonialsSectionTitle}
        />
        <div className="grid border-t border-line md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal
              key={t.id ?? t.name}
              delay={i * 70}
              as="figure"
              className="flex flex-col justify-between gap-8 border-b border-line py-9 md:border-r md:px-8 md:py-10 md:last:border-r-0 md:[&:first-child]:pl-0 md:[&:last-child]:pr-0"
            >
              <ReviewBody t={t} />
            </Reveal>
          ))}
        </div>
      </SectionBand>
    </>
  );
}
