import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { SiteSettingsRow } from "@/lib/supabase/types";

export type SiteSettings = {
  accentColor: string;
  siteTitle: string;
  siteDescription: string;
  logoUrl: string | null;
  logoUrlLight: string | null;
  logoType: "text" | "image";
  logoText: string;
  faviconUrl: string | null;
  heroMediaType: "none" | "image" | "video" | "youtube";
  heroMediaUrl: string | null;
  heroMediaUrls: string[];
  heroOverlayOpacity: number;
  danceSectionEyebrow: string;
  danceSectionTitle: string;
  danceIntro: string;
  aboutDescription: string;
  linksBgType: "none" | "image" | "video" | "youtube";
  linksBgUrl: string | null;
  linksOverlayOpacity: number;
  navLinks: { label: string; href: string }[];
  heroEyebrow: string;
  heroIntro: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  marqueeItems: string[];
  stats: { value: number; suffix: string; label: string }[];
  workSectionEyebrow: string;
  workSectionTitle: string;
  servicesSectionEyebrow: string;
  servicesSectionTitle: string;
  testimonialsSectionEyebrow: string;
  testimonialsSectionTitle: string;
  aboutHeadline: string;
  aboutTimeline: { year: string; label: string; detail: string }[];
  aboutSkills: string[];
  footerHeading: string;
  footerSubtext: string;
  contactEmail: string;
  servicesAvailabilityHeading: string;
  servicesAvailabilityLabel: string;
  processSectionEyebrow: string;
  processSectionTitle: string;
  processSteps: { title: string; description: string }[];
};

export const defaultNavLinks = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Dance", href: "/dance" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const placeholderSettings: SiteSettings = {
  accentColor: "#ff2e88",
  siteTitle: "MJFIRD — breaker, designer, builder",
  siteDescription:
    "MJFIRD is a designer and developer with a decade in the cypher. Portfolio, services, and case studies.",
  logoUrl: null,
  logoUrlLight: null,
  logoType: "text",
  logoText: "MJFIRD",
  faviconUrl: null,
  heroMediaType: "none",
  heroMediaUrl: null,
  heroMediaUrls: [],
  heroOverlayOpacity: 60,
  danceSectionEyebrow: "Dance",
  danceSectionTitle: "The other half",
  danceIntro:
    "Breaking is where the design taste comes from. Here's the reel, the footage, and the battle record.",
  aboutDescription: "",
  linksBgType: "none",
  linksBgUrl: null,
  linksOverlayOpacity: 70,
  navLinks: defaultNavLinks,
  heroEyebrow: "Breaker — Designer — Builder",
  heroIntro:
    "A decade in the cypher taught me rhythm and restraint. I bring both to brand, motion, and web work for people who don't want to look like a template.",
  heroCtaPrimary: "See the work",
  heroCtaSecondary: "Start a project",
  marqueeItems: ["Brand Identity", "Motion Design", "Web Build", "Art Direction", "Cypher-tested"],
  stats: [
    { value: 10, suffix: "+", label: "Years in the cypher" },
    { value: 38, suffix: "", label: "Projects shipped" },
    { value: 14, suffix: "", label: "Cities battled in" },
    { value: 96, suffix: "%", label: "Lighthouse perf avg" },
  ],
  workSectionEyebrow: "Selected Work",
  workSectionTitle: "Recent moves",
  servicesSectionEyebrow: "Services",
  servicesSectionTitle: "What I build",
  testimonialsSectionEyebrow: "Word on the Floor",
  testimonialsSectionTitle: "What clients say",
  aboutHeadline: "Ten years reading rhythm — on the floor and on the grid.",
  aboutTimeline: [
    { year: "2015", label: "Started breaking", detail: "First cypher, first freeze, first time getting clowned for a bad landing." },
    { year: "2018", label: "First battle win", detail: "Regional 2v2 title — the first time it felt like more than a hobby." },
    { year: "2020", label: "Picked up design", detail: "Started making flyers for the crew because no one else would." },
    { year: "2022", label: "First client work", detail: "Brand identity for a local label, learned the business side fast." },
    { year: "2024", label: "Went full-time", detail: "Design and dev work for crews, labels, and small brands, full-time." },
  ],
  aboutSkills: [
    "Art direction", "Brand systems", "Motion design", "Next.js / React",
    "GSAP / WebGL", "Design systems", "CMS architecture", "Performance engineering",
  ],
  footerHeading: "Let's build\nsomething",
  footerSubtext: "Got a project / a battle to plan",
  contactEmail: "hello@mjfird.com",
  servicesAvailabilityHeading: "Booking projects\nfor Q4 2026",
  servicesAvailabilityLabel: "Availability",
  processSectionEyebrow: "Process",
  processSectionTitle: "How a project runs",
  processSteps: [
    { title: "Discovery", description: "A working session to pin down goals, audience, and the one thing the site has to do." },
    { title: "Direction", description: "Two design directions, explored fast, so we agree on a point of view before pixels get precious." },
    { title: "Build", description: "Design system first, then pages — motion and performance engineered in from the start, not bolted on." },
    { title: "Launch", description: "QA across devices, a short handover walkthrough, and you own everything — no lock-in." },
  ],
};

function mapRow(row: SiteSettingsRow): SiteSettings {
  return {
    accentColor: row.accent_color,
    siteTitle: row.site_title,
    siteDescription: row.site_description,
    logoUrl: row.logo_url,
    logoUrlLight: row.logo_url_light,
    logoType: row.logo_type ?? "text",
    logoText: row.logo_text || "MJFIRD",
    faviconUrl: row.favicon_url,
    heroMediaType: row.hero_media_type ?? "none",
    heroMediaUrl: row.hero_media_url,
    heroMediaUrls: (row.hero_media_urls ?? []).map((item) => item.url).filter(Boolean),
    danceSectionEyebrow: row.dance_section_eyebrow || placeholderSettings.danceSectionEyebrow,
    danceSectionTitle: row.dance_section_title || placeholderSettings.danceSectionTitle,
    danceIntro: row.dance_intro || placeholderSettings.danceIntro,
    aboutDescription: row.about_description ?? "",
    linksBgType: row.links_bg_type ?? "none",
    linksBgUrl: row.links_bg_url,
    linksOverlayOpacity:
      typeof row.links_overlay_opacity === "number"
        ? Math.min(100, Math.max(0, row.links_overlay_opacity))
        : 70,
    heroOverlayOpacity:
      typeof row.hero_overlay_opacity === "number"
        ? Math.min(100, Math.max(0, row.hero_overlay_opacity))
        : 60,
    navLinks: row.nav_links?.length ? row.nav_links : defaultNavLinks,
    heroEyebrow: row.hero_eyebrow,
    heroIntro: row.hero_intro,
    heroCtaPrimary: row.hero_cta_primary,
    heroCtaSecondary: row.hero_cta_secondary,
    marqueeItems: row.marquee_items?.length ? row.marquee_items : placeholderSettings.marqueeItems,
    stats: row.stats?.length ? row.stats : placeholderSettings.stats,
    workSectionEyebrow: row.work_section_eyebrow || placeholderSettings.workSectionEyebrow,
    workSectionTitle: row.work_section_title || placeholderSettings.workSectionTitle,
    servicesSectionEyebrow: row.services_section_eyebrow || placeholderSettings.servicesSectionEyebrow,
    servicesSectionTitle: row.services_section_title || placeholderSettings.servicesSectionTitle,
    testimonialsSectionEyebrow: row.testimonials_section_eyebrow || placeholderSettings.testimonialsSectionEyebrow,
    testimonialsSectionTitle: row.testimonials_section_title || placeholderSettings.testimonialsSectionTitle,
    aboutHeadline: row.about_headline,
    aboutTimeline: row.about_timeline?.length ? row.about_timeline : placeholderSettings.aboutTimeline,
    aboutSkills: row.about_skills?.length ? row.about_skills : placeholderSettings.aboutSkills,
    footerHeading: row.footer_heading,
    footerSubtext: row.footer_subtext,
    contactEmail: row.contact_email,
    servicesAvailabilityHeading: row.services_availability_heading,
    servicesAvailabilityLabel: row.services_availability_label,
    processSectionEyebrow: row.process_section_eyebrow || placeholderSettings.processSectionEyebrow,
    processSectionTitle: row.process_section_title || placeholderSettings.processSectionTitle,
    processSteps: row.process_steps?.length ? row.process_steps : placeholderSettings.processSteps,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured) return placeholderSettings;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("site_settings").select("*").limit(1).single();
    if (error || !data) return placeholderSettings;
    return mapRow(data as SiteSettingsRow);
  } catch {
    return placeholderSettings;
  }
}
