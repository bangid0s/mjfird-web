import type { Metadata } from "next";
import InquiryForm from "@/components/contact/InquiryForm";
import Reveal from "@/components/motion/Reveal";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getStorefrontService } from "@/lib/data/services";
import { formatUSD, quote } from "@/lib/services/storefront";
import { inquiryPreselect } from "@/lib/inquiry-options";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a project with MJFIRD.",
};

// What a client can expect after sending the form.
const NEXT_STEPS = ["I reply within two days.", "You get a quote and a timeline.", "Work starts once payment is in."];

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
  const characters = typeof params.characters === "string" ? Number.parseInt(params.characters, 10) || 0 : 0;
  const licenseId = typeof params.license === "string" ? params.license : "personal";
  const backgroundId = typeof params.background === "string" ? params.background : "";
  const priced = quote(service.packages, service.addons, pkgId, addonIds, characters, service.licenses, licenseId, service.backgrounds, backgroundId);
  const background = service.backgrounds.find((b) => b.id === priced?.backgroundId);
  if (!priced) return `Service: ${service.title}\n\n`;
  const pkg = service.packages.find((p) => p.id === priced.packageId)!;
  const addons = service.addons.filter((a) => priced.addonIds.includes(a.id));
  return [
    `Service: ${service.title} — ${pkg.name} (${formatUSD(pkg.price)})`,
    ...(priced.extraCharacters
      ? [`Extra characters: ${priced.extraCharacters} (+${formatUSD(pkg.price * priced.extraCharacters)})`]
      : []),
    ...(background
      ? [`Background: ${background.name}${background.price ? ` (+${formatUSD(background.price)})` : ""}`]
      : []),
    ...(addons.length ? [`Add-ons: ${addons.map((a) => `${a.name} (+${formatUSD(a.price)})`).join(", ")}`] : []),
    ...(priced.licenseFee
      ? [
          `License: ${service.licenses.find((l) => l.id === priced.licenseId)?.name} (+${priced.licensePercent}%, +${formatUSD(priced.licenseFee)})`,
        ]
      : []),
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
  const params = await searchParams;
  const [settings, initialMessage] = await Promise.all([getSiteSettings(), servicePrefill(params)]);
  const preselect = inquiryPreselect(params.type);

  return (
    <div className="container-page grid gap-12 pb-[var(--space-section)] pt-14 sm:pt-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <Reveal className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
        <p className="eyebrow eyebrow-accent">Contact</p>
        <h1 className="display-lg">Start a project</h1>
        <p className="max-w-sm text-body-lg text-pretty text-ink-muted">
          Tell me what you need made. I read every inquiry myself.
        </p>

        <ol className="flex flex-col border-t border-line">
          {NEXT_STEPS.map((line, i) => (
            <li key={line} className="flex items-baseline gap-4 border-b border-line py-3.5 text-body text-ink">
              <span className="mono-meta text-ink">{String(i + 1).padStart(2, "0")}</span>
              {line}
            </li>
          ))}
        </ol>

        <div className="mt-2 flex flex-col gap-1.5">
          <p className="label">Or email me directly</p>
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
        <InquiryForm
          initialMessage={initialMessage}
          initialProjectType={preselect.projectType}
          initialBudget={preselect.budget}
          contactEmail={settings.contactEmail}
        />
      </Reveal>
    </div>
  );
}
