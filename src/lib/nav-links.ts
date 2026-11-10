export type NavLink = { label: string; href: string };

/** The bar shows a few links and a contact button; everything else overflows. */
export function partitionNavLinks(links: NavLink[], max = 5): { primary: NavLink[]; overflow: NavLink[] } {
  const seen = new Set<string>();
  const unique = links.filter((l) => {
    if (l.href === "/contact" || seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
  return { primary: unique.slice(0, max), overflow: unique.slice(max) };
}
