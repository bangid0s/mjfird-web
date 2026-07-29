import Link from "next/link";
import { cn } from "@/lib/cn";
import type { LinkItem } from "@/lib/data/links";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

// Groups links under their section heading, keeping the admin's sort order and
// the order in which each heading first appears. Links with no section render
// first, ungrouped.
function groupBySection(items: LinkItem[]) {
  const groups: { section: string; items: LinkItem[] }[] = [];
  for (const item of items) {
    const section = item.section.trim();
    const existing = groups.find((group) => group.section === section);
    if (existing) existing.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}

function Row({ link }: { link: LinkItem }) {
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {link.emoji && (
          <span aria-hidden="true" className="text-lg leading-none">
            {link.emoji}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-body text-body-sm font-medium">{link.label}</span>
          {link.description && (
            <span className="mt-0.5 block truncate font-body text-label text-accent-ink/70">
              {link.description}
            </span>
          )}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
      >
        →
      </span>
    </>
  );

  const classes = cn(
    "group flex items-center justify-between gap-4 rounded-2xl bg-accent px-5 py-4 text-accent-ink",
    "transition-[background-color,box-shadow] duration-[var(--duration-fast)] hover:bg-accent/85",
    link.highlight && "ring-2 ring-accent/40 ring-offset-2 ring-offset-bg-raised",
  );

  return isExternal(link.url) ? (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={classes}>
      {inner}
    </a>
  ) : (
    <Link href={link.url} className={classes}>
      {inner}
    </Link>
  );
}

export default function LinkList({ items }: { items: LinkItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {groupBySection(items).map((group, i) => (
        <div key={`${group.section}-${i}`} className="flex flex-col gap-3">
          {group.section && (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint">
                {group.section}
              </h2>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}
          {group.items.map((link, j) => (
            <Row key={`${link.url}-${j}`} link={link} />
          ))}
        </div>
      ))}
    </div>
  );
}
