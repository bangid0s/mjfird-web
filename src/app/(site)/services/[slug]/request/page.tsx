import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RequestForm from "@/components/services/RequestForm";
import { getStorefrontService } from "@/lib/data/services";
import { requireUser } from "@/lib/auth/session";
import { effectiveAvailability } from "@/lib/services/storefront";

export const metadata: Metadata = { title: "Request a commission", robots: { index: false } };

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ package?: string; addons?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const qs = new URLSearchParams(query as Record<string, string>).toString();
  const { supabase, user } = await requireUser(`/services/${slug}/request${qs ? `?${qs}` : ""}`);

  const service = await getStorefrontService(slug);
  if (!service) notFound();

  const { data: profile } = await supabase.from("client_profiles").select("display_name").eq("id", user.id).maybeSingle();
  const closed = effectiveAvailability(service.availability, service.slotsTotal, service.slotsTaken) === "closed";

  return (
    <div className="container-page pb-[var(--space-section)] pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href={`/services/${service.slug}`} className="spec text-ink-muted transition-colors hover:text-accent">
          ← {service.title}
        </Link>
      </nav>
      <header className="mb-12 flex flex-col gap-4">
        <p className="eyebrow eyebrow-accent">Request</p>
        <h1 className="display-lg text-balance">{service.title}</h1>
      </header>

      {closed || service.packages.length === 0 ? (
        <div className="flex max-w-xl flex-col items-start gap-5 border-t border-line pt-8">
          <p className="text-body-lg text-pretty text-ink-muted">
            {closed
              ? "This service is closed for new requests right now."
              : "Packages for this service are still being set up."}{" "}
            You can still reach me through the contact page.
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
          initialPackage={query.package}
          initialAddons={(query.addons ?? "").split(",").filter(Boolean)}
        />
      )}
    </div>
  );
}
