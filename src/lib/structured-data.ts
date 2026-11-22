import { SITE_URL } from "@/lib/site-url";

/*
  One person behind every page. Each schema.org block that names an author,
  creator or provider points at the same @id, so search engines (and AI
  search) join the work, the services, the posts and the About page into one
  entity: M.J. Fird. Only facts the site itself states go in here.
*/

export const PERSON_ID = `${SITE_URL}/#person`;
const ARTIST = "M.J. Fird";

/** Short reference for author / creator / provider fields. */
export const personRef = { "@type": "Person", "@id": PERSON_ID, name: ARTIST, url: `${SITE_URL}/about` } as const;

/** "Semarang, Indonesia - Working remotely" → locality + country. */
export function parseLocation(text: string): { addressLocality?: string; addressCountry?: string } {
  const place = text.split(/\s[-–—]\s/)[0] ?? "";
  const parts = place.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { addressCountry: parts[0] };
  return { addressLocality: parts[0], addressCountry: parts[parts.length - 1] };
}

type PersonFacts = {
  name: string;
  tagline: string;
  avatarUrl: string | null;
  socials: { url: string }[];
  jobTitle?: string;
  location?: string;
  /** What the person makes, e.g. the service names. */
  knowsAbout?: string[];
};

/** The full Person, for the homepage and the About page. */
export function personSchema(facts: PersonFacts) {
  const address = facts.location ? parseLocation(facts.location) : {};
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: facts.name || ARTIST,
    alternateName: "MJFIRD",
    url: `${SITE_URL}/about`,
    ...(facts.tagline && { description: facts.tagline }),
    ...(facts.jobTitle && { jobTitle: facts.jobTitle }),
    ...(facts.avatarUrl && { image: facts.avatarUrl }),
    ...(Object.keys(address).length > 0 && { address: { "@type": "PostalAddress", ...address } }),
    ...(facts.knowsAbout && facts.knowsAbout.length > 0 && { knowsAbout: facts.knowsAbout }),
    sameAs: facts.socials.map((s) => s.url).filter((url) => /^https?:\/\//.test(url)),
  };
}

/** A breadcrumb trail; the last crumb is the current page. */
export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}

type Package = { name: string; price: number; delivery_days?: number };

/** A commission as schema.org Service with one Offer per package. */
export function serviceSchema(service: { slug: string; title: string; description: string; coverUrl?: string; packages: Package[] }) {
  const url = `${SITE_URL}/services/${service.slug}`;
  const priced = service.packages.filter((p) => p.price > 0);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    ...(service.description && { description: service.description }),
    serviceType: "Commission illustration",
    url,
    ...(service.coverUrl && { image: service.coverUrl }),
    provider: personRef,
    areaServed: "Worldwide",
    ...(priced.length > 0 && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: Math.min(...priced.map((p) => p.price)),
        highPrice: Math.max(...priced.map((p) => p.price)),
        offerCount: priced.length,
        offers: priced.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: p.price,
          priceCurrency: "USD",
          url,
          seller: personRef,
        })),
      },
    }),
  };
}
