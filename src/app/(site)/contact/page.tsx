import type { Metadata } from "next";
import InquiryForm from "@/components/contact/InquiryForm";
import Reveal from "@/components/motion/Reveal";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getStorefrontService } from "@/lib/data/services";
import { formatUSD, quote } from "@/lib/services/storefront";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a project with MJFIRD.",
};

/*
  "Request this service" on /services/[slug] lands here with the chosen
  package and add-ons in the query string. The selection is re-priced from the
  stored service (never from the URL) and pre-fills the brief.
*/
async function servicePrefill(params: { [key: string]: string | string[] | undefined }) {
  const slug = typeof params.service === "string" ? params.service : "";
  if (!slug) return "";
  const service = await getStorefrontService(slug);
  if (!service) return "";
  const pkgId = typeof params.package === "string" ? params.package : "";
  const addonIds = typeof params.addons === "string" ? params.addons.split(",").filter(Boolean) : [];
  const priced = quote(service.packages, service.addons, pkgId, addonIds);
  if (!priced) return `Service: ${service.title}\n\n`;
  const pkg = service.packages.find((p) => p.id === priced.packageId)!;
  const addons = service.addons.filter((a) => priced.addonIds.includes(a.id));
  return [
    `Service: ${service.title} — ${pkg.name} (${formatUSD(pkg.price)})`,
    ...(addons.length ? [`Add-ons: ${addons.map((a) => `${a.name} (+${formatUSD(a.price)})`).join(", ")}`] : []),
    `Estimated total: ${formatUSD(priced.total)}`,
    "",
    "",
  ].join("\n");
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [settings, initialMessage] = await Promise.all([
    getSiteSettings(),
    searchParams.then(servicePrefill),
  ]);

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
        <InquiryForm initialMessage={initialMessage} />
      </Reveal>
    </div>
  );
}
