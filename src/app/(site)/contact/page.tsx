import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import InquiryForm from "@/components/contact/InquiryForm";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a project with MJFIRD.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto grid max-w-6xl gap-16 px-6 py-20 sm:grid-cols-[1fr_1.3fr] sm:px-10">
      <div>
        <SectionHeader eyebrow="Contact" title="Start a project" />
        <p className="max-w-sm font-body text-body-lg text-ink-muted">
          Tell me what you&apos;re building. I read every inquiry myself and reply
          within a couple of days.
        </p>
        <div className="mt-10 flex flex-col gap-1">
          <p className="font-mono text-label uppercase tracking-[0.15em] text-ink-faint">
            Or, email direct
          </p>
          <a
            href={`mailto:${settings.contactEmail}`}
            className="font-body text-body text-ink hover:text-accent"
          >
            {settings.contactEmail}
          </a>
        </div>
      </div>
      <InquiryForm />
    </div>
  );
}
