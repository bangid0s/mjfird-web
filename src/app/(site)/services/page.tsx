import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";
import ServicesBrowser from "@/components/services/ServicesBrowser";
import Reveal from "@/components/motion/Reveal";
import { getStorefrontServices } from "@/lib/data/services";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Services",
  description: "Commission illustration and design from MJFIRD — packages, samples, and pricing in USD.",
};

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getStorefrontServices(), getSiteSettings()]);
  const availabilityLines = settings.servicesAvailabilityHeading.split("\n");

  return (
    <div>
      <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
        <SectionHeader index={1} eyebrow="Services" title="Commissions & services" />

        {services.length > 0 ? (
          <ServicesBrowser services={services} />
        ) : (
          <div className="flex flex-col items-start gap-5 border-t border-line pt-10">
            <p className="max-w-lg text-body-lg text-pretty text-ink-muted">
              New commission slots are being prepared. In the meantime, tell me what you have in mind.
            </p>
            <MagneticButton href="/contact" arrow>
              Start an inquiry
            </MagneticButton>
          </div>
        )}
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
