import KineticWordmark from "@/components/hero/KineticWordmark";
import HeroMedia from "@/components/hero/HeroMedia";
import MagneticButton from "@/components/ui/MagneticButton";
import SectionHeader from "@/components/ui/SectionHeader";
import FeaturedWork from "@/components/work/FeaturedWork";
import Marquee from "@/components/ui/Marquee";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { getProjects } from "@/lib/data/projects";
import { getServices } from "@/lib/data/services";
import { getTestimonials } from "@/lib/data/testimonials";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site-url";

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
      <section className="relative">
        {settings.heroMediaType !== "none" &&
          (settings.heroMediaUrl || settings.heroMediaUrls.length > 0) && (
            <HeroMedia
              type={settings.heroMediaType}
              url={settings.heroMediaUrl ?? ""}
              urls={settings.heroMediaUrls}
              overlayOpacity={settings.heroOverlayOpacity}
              animation={settings.heroAnimation}
            />
          )}
        <div className="relative mx-auto flex min-h-[calc(100svh-5rem)] max-w-6xl flex-col justify-center gap-8 px-6 py-20 sm:px-10">
          <p className="font-mono text-label uppercase tracking-[0.3em] text-ink-muted">
            {settings.heroEyebrow}
          </p>
          <KineticWordmark />
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-md font-body text-body-lg text-ink-muted">{settings.heroIntro}</p>
            <div className="flex gap-4">
              <MagneticButton href="/work" cursorLabel="view">
                {settings.heroCtaPrimary}
              </MagneticButton>
              <MagneticButton href="/contact" variant="secondary" cursorLabel="view">
                {settings.heroCtaSecondary}
              </MagneticButton>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={settings.marqueeItems} />

      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <SectionHeader eyebrow={settings.workSectionEyebrow} title={settings.workSectionTitle} />
        <FeaturedWork projects={featured} />
      </section>

      <section className="border-y border-line bg-bg-raised">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 py-16 sm:grid-cols-4 sm:px-10">
          {settings.stats.map((stat) => (
            <AnimatedNumber key={stat.label} value={stat.value} suffix={stat.suffix} label={stat.label} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <SectionHeader eyebrow={settings.servicesSectionEyebrow} title={settings.servicesSectionTitle} />
        <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
          {services.map((service) => (
            <div key={service.title} className="flex flex-col gap-4 bg-bg p-8">
              <h3 className="font-display text-xl uppercase text-ink">{service.title}</h3>
              <p className="font-body text-body-sm text-ink-muted">{service.description}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {service.deliverables.map((d) => (
                  <li key={d} className="font-mono text-label text-ink-faint">
                    · {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <SectionHeader
          eyebrow={settings.testimonialsSectionEyebrow}
          title={settings.testimonialsSectionTitle}
        />
        <div className="grid gap-8 sm:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="flex flex-col justify-between gap-6 border-t border-line pt-6">
              <blockquote className="font-body text-body text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="flex items-center gap-3">
                {t.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatarUrl}
                    alt={t.name}
                    className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
                  />
                )}
                <span className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted">
                  {t.name}
                  {t.role ? ` — ${t.role}` : ""}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
