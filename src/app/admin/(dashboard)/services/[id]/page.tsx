import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServiceForm from "@/components/admin/ServiceForm";
import { updateService } from "@/lib/admin/services-actions";
import PageHeader from "@/components/admin/PageHeader";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: service } = await supabase.from("services").select("*").eq("id", id).single();

  if (!service) notFound();

  return (
    <div>
      <PageHeader title="Edit service" backHref="/admin/services" backLabel="Services" />
      <ServiceForm service={service} action={updateService.bind(null, id)} />
    </div>
  );
}
