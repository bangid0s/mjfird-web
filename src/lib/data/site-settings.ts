import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { SiteSettingsRow } from "@/lib/supabase/types";

export type LinkBrand = { name: string; logoUrl: string; note: string; url: string };

/**
 * One image in the homepage hero slider. The copy fields are per-slide
 * overrides — blank means "use the hero's own eyebrow / intro / button".
 */
export type HeroSlide = {
  url: string;
  alt: string;
  eyebrow: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type SiteSettings = {
  accentColor: string;
  siteTitle: string;
  siteDescription: string;
  logoUrl: string | null;
  logoUrlLight: string | null;
  logoType: "text" | "image";
  logoText: string;
  faviconUrl: string | null;
  shareImageMode: "auto" | "custom";
  shareImageUrl: string | null;
  shareTitle: string;
  shareDescription: string;
  shareCardEyebrow: string;
  shareCardHeadline: string;
  shareCardBgUrl: string | null;
  shareCardOverlayOpacity: number;
  shareTwitterHandle: string;
  gaMeasurementId: string;
  /** Bumped on every save — used to cache-bust the share image on social platforms. */
  updatedAt: string;
  heroMediaType: "none" | "image" | "video" | "youtube";
  heroMediaUrl: string | null;
  heroSlides: HeroSlide[];
  heroOverlayOpacity: number;
  heroAnimation: "none" | "zoom" | "drift" | "pulse";
  heroSlideDuration: number;
  danceSectionEyebrow: string;
  danceSectionTitle: string;
  danceIntro: string;
  aboutDescription: string;
  linksBgType: "none" | "image" | "video" | "youtube";
  linksBgUrl: string | null;
  linksOverlayOpacity: number;
  linksWindowTitle: string;
  linksHeadline: string;
  linksRunBy: string;
  linksIntro: string;
  linksCtaLabel: string;
  linksCtaUrl: string;
  linksShowStatus: boolean;
  linksTimezone: string;
  linksOpenTime: string;
  linksCloseTime: string;
  linksOpenDays: string;
  linksBrands: LinkBrand[];
  linksBrandSlots: number;
  linksBrandCtaUrl: string;
  linksTags: string[];
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
  /** Button under the About intro. A blank label hides it. */
  aboutCtaLabel: string;
  aboutCtaUrl: string;
  footerHeading: string;
  footerSubtext: string;
  contactEmail: string;
  servicesAvailabilityHeading: string;
  servicesAvailabilityLabel: string;
  processSectionEyebrow: string;
  processSectionTitle: string;
  processSteps: { title: string; description: string }[];
  /** /resume — blank headline and summary fall back to the profile. */
  resumeHeadline: string;
  resumeRole: string;
  resumeLocation: string;
  resumeSummary: string;
  resumeEmail: string;
  resumeSkills: string[];
  resumePdfUrl: string;
  /** Portrait for /resume only — blank falls back to the profile avatar. */
  resumePhotoUrl: string;
  resumeLanguages: { name: string; level: string }[];
  /** /gallery */
  galleryHeadline: string;
  galleryIntro: string;
};

export const defaultNavLinks = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Dance", href: "/dance" },
  { label: "Gallery", href: "/gallery" },
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
  shareImageMode: "auto",
  shareImageUrl: null,
  shareTitle: "",
  shareDescription: "",
  shareCardEyebrow: "",
  shareCardHeadline: "",
  shareCardBgUrl: null,
  shareCardOverlayOpacity: 55,
  shareTwitterHandle: "",
  gaMeasurementId: "",
  updatedAt: "",
  heroMediaType: "none",
  heroMediaUrl: null,
  heroSlides: [],
  heroOverlayOpacity: 60,
  heroAnimation: "none",
  heroSlideDuration: 5,
  danceSectionEyebrow: "Dance",
  danceSectionTitle: "The other half",
  danceIntro:
    "Breaking is where the design taste comes from. Here's the reel, the footage, and the battle record.",
  aboutDescription: "",
  linksBgType: "none",
  linksBgUrl: null,
  linksOverlayOpacity: 70,
  linksWindowTitle: "// Welcome to",
  linksHeadline: "",
  linksRunBy: "",
  linksIntro: "",
  linksCtaLabel: "Contact Now",
  linksCtaUrl: "/contact",
  linksShowStatus: true,
  linksTimezone: "Asia/Jakarta",
  linksOpenTime: "09:00",
  linksCloseTime: "17:00",
  linksOpenDays: "1,2,3,4,5",
  linksBrands: [],
  linksBrandSlots: 3,
  linksBrandCtaUrl: "",
  linksTags: [],
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
  aboutCtaLabel: "See the dance side",
  aboutCtaUrl: "/dance",
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
  resumeHeadline: "",
  resumeRole: "Designer, developer & breaker",
  resumeLocation: "Jakarta — working remotely",
  resumeSummary: "",
  resumeEmail: "",
  resumeSkills: ["Brand identity", "Art direction", "Web design", "Next.js", "Motion", "Illustration"],
  resumePdfUrl: "",
  resumePhotoUrl: "",
  resumeLanguages: [
    { name: "Indonesian", level: "Native" },
    { name: "English", level: "Professional" },
  ],
  galleryHeadline: "Gallery",
  galleryIntro: "Selected frames — work, process and the floor.",
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
    shareImageMode: row.share_image_mode === "custom" ? "custom" : "auto",
    shareImageUrl: row.share_image_url || null,
    shareTitle: row.share_title ?? "",
    shareDescription: row.share_description ?? "",
    shareCardEyebrow: row.share_card_eyebrow ?? "",
    shareCardHeadline: row.share_card_headline ?? "",
    shareCardBgUrl: row.share_card_bg_url || null,
    shareCardOverlayOpacity:
      typeof row.share_card_overlay_opacity === "number"
        ? Math.min(100, Math.max(0, row.share_card_overlay_opacity))
        : 55,
    shareTwitterHandle: row.share_twitter_handle ?? "",
    gaMeasurementId: row.ga_measurement_id ?? "",
    updatedAt: row.updated_at ?? "",
    heroMediaType: row.hero_media_type ?? "none",
    heroMediaUrl: row.hero_media_url,
    heroSlides: (row.hero_media_urls ?? [])
      .filter((item) => Boolean(item?.url))
      .map((item) => ({
        url: item.url,
        alt: item.alt ?? "",
        eyebrow: item.eyebrow ?? "",
        intro: item.intro ?? "",
        ctaLabel: item.ctaLabel ?? "",
        ctaUrl: item.ctaUrl ?? "",
      })),
    heroAnimation: row.hero_animation ?? "none",
    heroSlideDuration:
      typeof row.hero_slide_duration === "number" && row.hero_slide_duration > 0
        ? Math.min(30, Math.max(1, row.hero_slide_duration))
        : 5,
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
    linksWindowTitle: row.links_window_title ?? placeholderSettings.linksWindowTitle,
    linksHeadline: row.links_headline ?? "",
    linksRunBy: row.links_run_by ?? "",
    linksIntro: row.links_intro ?? "",
    linksCtaLabel: row.links_cta_label || placeholderSettings.linksCtaLabel,
    linksCtaUrl: row.links_cta_url || placeholderSettings.linksCtaUrl,
    linksShowStatus: row.links_show_status ?? true,
    linksTimezone: row.links_timezone || placeholderSettings.linksTimezone,
    linksOpenTime: row.links_open_time || placeholderSettings.linksOpenTime,
    linksCloseTime: row.links_close_time || placeholderSettings.linksCloseTime,
    linksOpenDays: row.links_open_days ?? placeholderSettings.linksOpenDays,
    linksBrands: (row.links_brands ?? [])
      .filter((brand) => typeof brand?.name === "string" && brand.name)
      .map((brand) => ({
        name: brand.name,
        logoUrl: brand.logoUrl ?? "",
        note: brand.note ?? "",
        url: brand.url ?? "",
      })),
    linksBrandSlots:
      typeof row.links_brand_slots === "number"
        ? Math.min(6, Math.max(0, row.links_brand_slots))
        : 3,
    linksBrandCtaUrl: row.links_brand_cta_url ?? "",
    linksTags: row.links_tags ?? [],
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
    // Not `||` — a blank label is a deliberate "hide the button", not a gap to
    // fill with the default.
    aboutCtaLabel: row.about_cta_label ?? placeholderSettings.aboutCtaLabel,
    aboutCtaUrl: row.about_cta_url || placeholderSettings.aboutCtaUrl,
    footerHeading: row.footer_heading,
    footerSubtext: row.footer_subtext,
    contactEmail: row.contact_email,
    servicesAvailabilityHeading: row.services_availability_heading,
    servicesAvailabilityLabel: row.services_availability_label,
    processSectionEyebrow: row.process_section_eyebrow || placeholderSettings.processSectionEyebrow,
    processSectionTitle: row.process_section_title || placeholderSettings.processSectionTitle,
    processSteps: row.process_steps?.length ? row.process_steps : placeholderSettings.processSteps,
    resumeHeadline: row.resume_headline ?? "",
    resumeRole: row.resume_role ?? "",
    resumeLocation: row.resume_location ?? "",
    resumeSummary: row.resume_summary ?? "",
    resumeEmail: row.resume_email ?? "",
    resumeSkills: row.resume_skills ?? [],
    resumePdfUrl: row.resume_pdf_url ?? "",
    resumePhotoUrl: row.resume_photo_url ?? "",
    resumeLanguages: (row.resume_languages ?? [])
      .filter((language) => typeof language?.name === "string" && language.name)
      .map((language) => ({ name: language.name, level: language.level ?? "" })),
    galleryHeadline: row.gallery_headline || placeholderSettings.galleryHeadline,
    galleryIntro: row.gallery_intro ?? "",
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
