import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ServicesList from "@/components/admin/ServicesList";
import PageHeader, { HeaderAction } from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import type { ServiceRow } from "@/lib/supabase/types";

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true });

  const services = (data as ServiceRow[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Services"
        description={
          <>
            What clients can commission, shown on the homepage and /services. Drag to reorder. The text around
            them (process, questions, retainer) is under{" "}
            <Link href="/admin/pages/services" className="font-medium text-ink underline underline-offset-4">
              Services page
            </Link>
            .
          </>
        }
        action={<HeaderAction href="/admin/services/new">New service</HeaderAction>}
      />

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="List what you offer — each service shows its deliverables on the public site."
          ctaHref="/admin/services/new"
          ctaLabel="Add a service"
        />
      ) : (
        <ServicesList services={services} />
      )}
    </div>
  );
}
