import Link from "next/link";

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
    <div className="flex flex-col items-center gap-4 border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-xl uppercase text-ink">{title}</p>
      {description && <p className="max-w-sm font-body text-body-sm text-ink-muted">{description}</p>}
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="mt-2 bg-accent px-5 py-2.5 font-mono text-label uppercase tracking-[0.15em] text-accent-ink"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
