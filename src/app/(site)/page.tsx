import Link from "next/link";
import Hero from "@/components/hero/Hero";
import SectionHeader from "@/components/ui/SectionHeader";
import FeaturedWork from "@/components/work/FeaturedWork";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Reveal from "@/components/motion/Reveal";
import SectionBand, { type SectionTone } from "@/components/layout/SectionBand";
import SmartImage from "@/components/media/SmartImage";
import { getProjects } from "@/lib/data/projects";
import { getServices } from "@/lib/data/services";
import { getTestimonials } from "@/lib/data/testimonials";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site-url";

/*
  The stats strip is the page's one loud moment. "solid" fills it with the
  accent; "lilac" keeps it as a quiet tint like the bands around it. One line,
  because it's the kind of decision that gets revisited.
*/
const STATS_TONE: SectionTone = "solid";

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
        overlayOpacity={settings.heroOverlayOpacity}
        animation={settings.heroAnimation}
        slideDuration={settings.heroSlideDuration}
        eyebrow={settings.heroEyebrow}
        intro={settings.heroIntro}
        ctaPrimary={settings.heroCtaPrimary}
        ctaSecondary={settings.heroCtaSecondary}
      />

      {/* Featured work — deliberately untinted: the artwork supplies the colour. */}
      <SectionBand>
        <SectionHeader
          eyebrow={settings.workSectionEyebrow}
          title={settings.workSectionTitle}
          action={
            <Link
              href="/work"
              data-cursor="view"
              className="group inline-flex items-center gap-2 text-body-sm font-medium text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
            >
              All work
              <span
                aria-hidden="true"
                className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          }
        />
        <FeaturedWork projects={featured} />
      </SectionBand>

      {/* Stats */}
      <SectionBand tone={STATS_TONE} size="compact">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          {settings.stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 60}>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} label={stat.label} />
            </Reveal>
          ))}
        </div>
      </SectionBand>

      {/* Services */}
      <SectionBand tone="sand">
        <SectionHeader
          eyebrow={settings.servicesSectionEyebrow}
          title={settings.servicesSectionTitle}
          action={
            <Link
              href="/services"
              data-cursor="view"
              className="group inline-flex items-center gap-2 text-body-sm font-medium text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
            >
              How I work
              <span
                aria-hidden="true"
                className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {services.map((service, i) => (
            <Reveal
              key={service.title}
              delay={i * 70}
              className="surface group flex flex-col gap-4 p-7 transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-freeze)] hover:-translate-y-1 hover:border-line-strong hover:shadow-md"
            >
              <span className="mono-meta">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display-sm">{service.title}</h3>
              <p className="text-body-sm text-pretty text-ink-muted">{service.description}</p>
              <ul className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
                {service.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-body-sm text-ink-faint">
                    <span aria-hidden="true" className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {d}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </SectionBand>

      {/* Testimonials */}
      <SectionBand tone="mint">
        <SectionHeader
          eyebrow={settings.testimonialsSectionEyebrow}
          title={settings.testimonialsSectionTitle}
        />
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal
              key={t.name}
              delay={i * 70}
              as="figure"
              className="surface flex flex-col justify-between gap-6 p-7"
            >
              <blockquote className="text-body text-pretty text-ink">
                <span aria-hidden="true" className="mb-3 block text-3xl leading-none text-accent">
                  &ldquo;
                </span>
                {t.quote}
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-line pt-5">
                {t.avatarUrl && (
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line">
                    <SmartImage src={t.avatarUrl} alt={t.name} sizes="36px" />
                  </span>
                )}
                <span className="text-body-sm text-ink-muted">
                  <span className="font-medium text-ink">{t.name}</span>
                  {t.role ? ` — ${t.role}` : ""}
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </SectionBand>
    </>
  );
}
