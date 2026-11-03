import Link from "next/link";
import { PlusIcon, SparkIcon } from "@/components/admin/AdminIcons";

export default function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-line-strong bg-bg-raised/40 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center border border-line bg-bg text-accent">
        <SparkIcon className="h-5 w-5" />
      </span>
      <p className="display-sm">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-pretty text-ink-muted">{description}</p>}
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="mt-2 inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-body-sm font-medium text-accent-ink transition-[filter] hover:brightness-110"
        >
          <PlusIcon className="h-4 w-4" />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
