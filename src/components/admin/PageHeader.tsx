import Link from "next/link";

export default function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-block font-mono text-label uppercase tracking-[0.15em] text-ink-faint transition-colors hover:text-ink"
        >
          ← {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm uppercase text-ink">{title}</h1>
          {description && (
            <p className="mt-2 max-w-lg font-body text-body-sm text-ink-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

export function HeaderAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="bg-accent px-5 py-2.5 font-mono text-label uppercase tracking-[0.15em] text-accent-ink"
    >
      {children}
    </Link>
  );
}
