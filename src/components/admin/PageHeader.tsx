import Link from "next/link";
import { ChevronLeftIcon, PlusIcon } from "@/components/admin/AdminIcons";

export default function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  /** Small line above the title — a section name or a count. */
  eyebrow?: string;
}) {
  return (
    <div className="mb-10 border-b border-line pb-8">
      {backHref && (
        <Link
          href={backHref}
          className="group mb-5 inline-flex items-center gap-1.5 text-body-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:-translate-x-0.5" />
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-2 text-body-sm font-medium text-accent-strong">{eyebrow}</p>}
          <h1 className="display-md">{title}</h1>
          {description && (
            <p className="mt-3 max-w-xl text-body text-pretty text-ink-muted">{description}</p>
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
      className="inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-body-sm font-medium text-accent-ink transition-[filter,transform] duration-[var(--duration-fast)] hover:brightness-110 active:translate-y-px"
    >
      <PlusIcon className="h-4 w-4" />
      {children}
    </Link>
  );
}
