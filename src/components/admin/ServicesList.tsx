"use client";

import Link from "next/link";
import { reorderServices, deleteService } from "@/lib/admin/services-actions";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import StatusBadge from "@/components/admin/StatusBadge";
import type { ServiceRow } from "@/lib/supabase/types";

export default function ServicesList({ services }: { services: ServiceRow[] }) {
  return (
    <ReorderableList
      items={services}
      onReorder={reorderServices}
      renderRow={(service) => (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-body text-body text-ink">{service.title}</span>
            <StatusBadge status={service.status} />
            {service.availability && service.availability !== "open" && (
              <span className="font-mono text-label uppercase text-ink-faint">{service.availability}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {service.slug && service.status === "published" && (
              <Link
                href={`/services/${service.slug}`}
                target="_blank"
                className="text-body-sm font-medium text-ink-muted hover:text-ink"
              >
                View
              </Link>
            )}
            <Link
              href={`/admin/services/${service.id}`}
              className="text-body-sm font-medium text-ink-muted hover:text-ink"
            >
              Edit
            </Link>
            <DeleteButton action={deleteService.bind(null, service.id)} />
          </div>
        </div>
      )}
    />
  );
}
