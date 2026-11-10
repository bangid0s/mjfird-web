import Link from "next/link";

const linkClass =
  "text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent";

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3 border-t border-line pt-8">
      <h2 className="display-sm">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-pretty text-ink-muted">{children}</div>
    </section>
  );
}

/** A bulleted list with the house spacing. */
export function LegalList({ children, ordered = false }: { children: React.ReactNode; ordered?: boolean }) {
  const className = `flex flex-col gap-2 pl-5 ${ordered ? "list-decimal" : "list-disc"}`;
  return ordered ? <ol className={className}>{children}</ol> : <ul className={className}>{children}</ul>;
}

/** Bold lead-in for a list item, e.g. "Fees:". */
export function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-ink">{children}</strong>;
}

/** Cross-reference to a numbered section on the same page. */
export function SectionRef({ n }: { n: number }) {
  return (
    <a href={`#section-${n}`} className={linkClass}>
      section {n}
    </a>
  );
}

/**
 * A simple data table. On phones each row stacks into a small card, with the
 * column name printed above each value, so nothing hides behind a side scroll.
 */
export function LegalTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <table className="w-full border-collapse text-left text-body-sm max-sm:block">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-sm:sr-only">
        <tr className="border-b border-line-strong">
          {head.map((h) => (
            <th key={h} scope="col" className="py-2 pr-4 align-bottom font-medium text-ink">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-sm:block">
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-line max-sm:flex max-sm:flex-col max-sm:gap-1.5 max-sm:py-3">
            {row.map((cell, j) =>
              j === 0 ? (
                <th key={j} scope="row" className="py-2 pr-4 align-top font-medium text-ink max-sm:p-0">
                  {cell}
                </th>
              ) : (
                <td
                  key={j}
                  data-label={head[j]}
                  className="py-2 pr-4 align-top max-sm:p-0 max-sm:before:block max-sm:before:text-ink-faint max-sm:before:content-[attr(data-label)]"
                >
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LegalDocument({
  eyebrow,
  title,
  intro,
  updated,
  contactEmail,
  related,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  updated: string;
  contactEmail: string;
  related: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <article className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <header className="mb-12 flex max-w-2xl flex-col gap-5">
        <p className="eyebrow eyebrow-accent">{eyebrow}</p>
        <h1 className="display-lg">{title}</h1>
        <p className="mono-meta">Last updated {updated}</p>
        {intro ? <div className="text-body text-pretty text-ink-muted">{intro}</div> : null}
      </header>

      <div className="flex max-w-2xl flex-col gap-8">
        {children}

        <LegalSection id="contact" title="Contact">
          <p>Questions about this page, an order, or your data go to one place.</p>
          <LegalList>
            <li>
              <Term>Studio:</Term>{" "}FiRD Creative Studio, operated by Mohammad Jamaluddin Firdaus (M.J Fird), Semarang,
              Indonesia
            </li>
            {contactEmail ? (
              <li>
                <Term>Email:</Term>{" "}
                <a href={`mailto:${contactEmail}`} className={linkClass}>
                  {contactEmail}
                </a>
              </li>
            ) : null}
            <li>
              <Term>Contact form:</Term>{" "}
              <Link href="/contact" className={linkClass}>
                mjfird.com/contact
              </Link>
            </li>
            <li>
              <Term>Socials:</Term>{" "}Instagram @m.j.fird · X @MJFird · Behance /FiRD
            </li>
          </LegalList>
          <p>
            <Link href={related.href} className={linkClass}>
              {related.label}
            </Link>
          </p>
        </LegalSection>
      </div>
    </article>
  );
}
