import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RequestForm from "@/components/services/RequestForm";
import TrackOnView from "@/components/analytics/TrackOnView";
import { getStorefrontService } from "@/lib/data/services";
import { requireUser } from "@/lib/auth/session";
import { effectiveAvailability } from "@/lib/services/storefront";
import { refreshDiscountFor } from "@/lib/discord/sync";

export const metadata: Metadata = { title: "Request a commission", robots: { index: false } };

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ package?: string; addons?: string; characters?: string; license?: string; background?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const qs = new URLSearchParams(query as Record<string, string>).toString();
  const { supabase, user } = await requireUser(`/services/${slug}/request${qs ? `?${qs}` : ""}`);

  const service = await getStorefrontService(slug);
  if (!service) notFound();

  const [{ data: profile }, discount] = await Promise.all([
    supabase.from("client_profiles").select("display_name").eq("id", user.id).maybeSingle(),
    refreshDiscountFor(supabase, user),
  ]);
  const closed = effectiveAvailability(service.availability, service.slotsTotal, service.slotsTaken) === "closed";

  return (
    <div className="container-page pb-[var(--space-section)] pt-10 sm:pt-14">
      <TrackOnView event="begin_checkout" params={{ item_id: service.slug, item_name: service.title, package: query.package }} />
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href={`/services/${service.slug}`} className="spec text-ink-muted transition-colors hover:text-accent">
          ← {service.title}
        </Link>
      </nav>
      <header className="mb-12 flex flex-col gap-4">
        <p className="eyebrow eyebrow-accent">{service.packages.length === 0 ? "Request a quote" : "Request"}</p>
        <h1 className="display-lg text-balance">{service.title}</h1>
      </header>

      {closed ? (
        <div className="flex max-w-xl flex-col items-start gap-5 border-t border-line pt-8">
          <p className="text-body-lg text-pretty text-ink-muted">
            This service is closed for new requests right now. You can still reach me through the contact page.
          </p>
          <Link href="/contact" className="spec bg-accent px-6 py-3.5 text-accent-ink hover:brightness-110">
            Contact me →
          </Link>
        </div>
      ) : (
        <RequestForm
          service={service}
          userId={user.id}
          email={user.email ?? ""}
          defaultName={profile?.display_name ?? ""}
          discountPercent={discount.percent}
          discountLabel={discount.label}
          initialPackage={query.package}
          initialAddons={(query.addons ?? "").split(",").filter(Boolean)}
          initialLicense={query.license}
          initialBackground={query.background}
          initialCharacters={Math.max(0, Number.parseInt(query.characters ?? "0", 10) || 0)}
        />
      )}
    </div>
  );
}
