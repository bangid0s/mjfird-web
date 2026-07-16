import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";
import SmartImage from "@/components/media/SmartImage";
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
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <SectionHeader eyebrow="Services" title="What I build" />
        <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
          {services.map((service) => (
            <div key={service.title} className="flex flex-col gap-4 bg-bg p-8">
              {service.imageUrl && (
                <div className="relative aspect-[4/3] overflow-hidden border border-line">
                  <SmartImage
                    src={service.imageUrl}
                    alt={service.title}
                    sizes="(min-width: 640px) 33vw, 100vw"
                  />
                </div>
              )}
              <h2 className="font-display text-xl uppercase text-ink">{service.title}</h2>
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
      </div>

      <div className="border-t border-line bg-bg-raised">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <SectionHeader
            eyebrow={settings.processSectionEyebrow}
            title={settings.processSectionTitle}
          />
          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {settings.processSteps.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-3 border-t border-line pt-6">
                <span className="font-mono text-label text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-lg uppercase text-ink">{step.title}</h3>
                <p className="font-body text-body-sm text-ink-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24 sm:px-10">
        <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-muted">
          {settings.servicesAvailabilityLabel}
        </p>
        <h2 className="font-display text-display-md uppercase leading-[0.9] text-ink">
          {availabilityLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < availabilityLines.length - 1 && <br />}
            </span>
          ))}
        </h2>
        <MagneticButton href="/contact" cursorLabel="view">
          Start an inquiry →
        </MagneticButton>
      </div>
    </div>
  );
}
