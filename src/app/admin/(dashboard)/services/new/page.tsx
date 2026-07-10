import ServiceForm from "@/components/admin/ServiceForm";
import { createService } from "@/lib/admin/services-actions";
import PageHeader from "@/components/admin/PageHeader";

export default function NewServicePage() {
  return (
    <div>
      <PageHeader title="New service" backHref="/admin/services" backLabel="Services" />
      <ServiceForm action={createService} />
    </div>
  );
}
