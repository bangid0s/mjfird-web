import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";
import SmartImage from "@/components/media/SmartImage";
import Reveal from "@/components/motion/Reveal";
import { getServices } from "@/lib/data/services";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Services",
  description: "Brand, motion, and web services from MJFIRD.",
};

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getServices(), getSiteSettings()]);
  const availabilityLines = settings.servicesAvailabilityHeading.split("\n");

  return (
    <div>
      <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
        <SectionHeader index={1} eyebrow="Services" title="What I build" />

        <div className="grid border-t border-line md:grid-cols-3">
          {services.map((service, i) => (
            <Reveal
              key={service.title}
              delay={i * 70}
              className="group flex flex-col border-b border-line md:border-r md:px-8 md:last:border-r-0 md:[&:first-child]:pl-0 md:[&:last-child]:pr-0"
            >
              {service.imageUrl && (
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-raised-2">
                  <SmartImage
                    src={service.imageUrl}
                    alt={service.title}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col gap-5 py-9 md:py-10">
                <span className="mono-meta">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="display-sm">{service.title}</h2>
                <p className="text-body-sm text-pretty text-ink-muted">{service.description}</p>
                <ul className="mt-auto flex flex-col gap-2 pt-5">
                  {service.deliverables.map((d) => (
                    <li key={d} className="spec flex items-start gap-2.5">
                      <span aria-hidden="true" className="mt-[0.5em] h-1 w-1 shrink-0 bg-accent" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="border-y border-line bg-bg-raised/60">
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader
            index={2}
            eyebrow={settings.processSectionEyebrow}
            title={settings.processSectionTitle}
          />
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {settings.processSteps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 70} className="flex flex-col gap-3">
                <span className="grid h-9 w-9 place-items-center bg-accent text-body-sm font-medium text-accent-ink">
                  {i + 1}
                </span>
                <h3 className="display-sm mt-1">{step.title}</h3>
                <p className="text-body-sm text-pretty text-ink-muted">{step.description}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>

      <div className="container-page flex flex-col items-start gap-7 py-[var(--space-section)]">
        <p className="eyebrow eyebrow-accent">{settings.servicesAvailabilityLabel}</p>
        <h2 className="display-lg max-w-3xl">
          {availabilityLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < availabilityLines.length - 1 && <br />}
            </span>
          ))}
        </h2>
        <MagneticButton href="/contact" size="lg" arrow cursorLabel="view">
          Start an inquiry
        </MagneticButton>
      </div>
    </div>
  );
}
