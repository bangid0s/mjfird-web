import Link from "next/link";

export function FillIn({ children }: { children: string }) {
  return <span className="font-medium text-ink">[M J to fill in: {children}]</span>;
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 className="display-sm">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-pretty text-ink-muted">{children}</div>
    </section>
  );
}

export default function LegalDocument({
  eyebrow,
  title,
  contactEmail,
  related,
  children,
}: {
  eyebrow: string;
  title: string;
  contactEmail: string;
  related: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <article className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <header className="mb-12 flex max-w-2xl flex-col gap-5">
        <p className="eyebrow eyebrow-accent">{eyebrow}</p>
        <p
          role="note"
          className="border border-accent/40 bg-bg-raised px-5 py-4 text-body text-ink"
        >
          This page is a template, not legal advice. M J needs to review it and edit it before relying on it.
        </p>
        <h1 className="display-lg">{title}</h1>
        <p className="mono-meta">Last updated 10 November 2026</p>
      </header>

      <div className="flex max-w-2xl flex-col gap-8">
        {children}

        <LegalSection title="Contact">
          <p>
            Questions about this page go through the{" "}
            <Link
              href="/contact"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent"
            >
              contact page
            </Link>
            {contactEmail ? (
              <>
                {" "}
                or by email at{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent"
                >
                  {contactEmail}
                </a>
              </>
            ) : null}
            .
          </p>
          <p>
            <Link
              href={related.href}
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent"
            >
              {related.label}
            </Link>
          </p>
        </LegalSection>
      </div>
    </article>
  );
}
