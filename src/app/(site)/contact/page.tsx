import type { Metadata } from "next";
import InquiryForm from "@/components/contact/InquiryForm";
import Reveal from "@/components/motion/Reveal";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a project with MJFIRD.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container-page grid gap-12 pb-[var(--space-section)] pt-14 sm:pt-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <Reveal className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
        <p className="eyebrow eyebrow-accent">Contact</p>
        <h1 className="display-lg">Start a project</h1>
        <p className="max-w-sm text-body-lg text-pretty text-ink-muted">
          Tell me what you&apos;re building. I read every inquiry myself and reply
          within a couple of days.
        </p>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-6">
          <p className="eyebrow">Or, email direct</p>
          <a
            href={`mailto:${settings.contactEmail}`}
            data-cursor="view"
            className="text-body-lg text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent"
          >
            {settings.contactEmail}
          </a>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <InquiryForm />
      </Reveal>
    </div>
  );
}
