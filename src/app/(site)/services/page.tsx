import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";
import ServicesBrowser from "@/components/services/ServicesBrowser";
import ProcessSteps from "@/components/services/ProcessSteps";
import RetainerBand from "@/components/services/RetainerBand";
import ServicesFaq from "@/components/services/ServicesFaq";
import { getStorefrontServices } from "@/lib/data/services";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Services",
  description: "Commission illustration and design from MJFIRD — packages, samples, and pricing in USD.",
};

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getStorefrontServices(), getSiteSettings()]);
  // The availability line used to be its own call-to-action block at the foot
  // of the page, right above the footer's. It is a fact about the services, so
  // it sits under their heading now.
  const availability = settings.servicesAvailabilityHeading.split("\n").join(" ").trim();

  return (
    <div>
      <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
        <SectionHeader
          index={1}
          eyebrow="Services"
          title="Commissions & services"
          description={availability || undefined}
        />

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

      <RetainerBand settings={settings} />

      <div className="border-b border-line bg-bg-raised/60">
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader
            index={2}
            eyebrow={settings.processSectionEyebrow}
            title={settings.processSectionTitle}
          />
          <ProcessSteps steps={settings.processSteps} />
        </div>
      </div>

      {settings.servicesFaq.length > 0 && (
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader index={3} eyebrow="FAQ" title="Before you ask" />
          <ServicesFaq items={settings.servicesFaq} />
        </div>
      )}
    </div>
  );
}
