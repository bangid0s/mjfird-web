export type ContentStatus = "draft" | "scheduled" | "published";
export type CaseStudyTemplate = "editorial" | "immersive" | "systems";
export type InquiryStatus = "new" | "read" | "archived";

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  client: string | null;
  year: string | null;
  role: string | null;
  category: string | null;
  hook: string | null;
  template: CaseStudyTemplate;
  cover_image: string | null;
  cover_focal_point: { x: number; y: number };
  gallery: { url: string; alt?: string; focal_point?: { x: number; y: number } }[];
  narrative: { context?: string; move?: string; build?: string; result?: string };
  featured: boolean;
  sort_order: number;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  seo_description: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  deliverables: string[];
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
};

export type TestimonialRow = {
  id: string;
  quote: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: unknown[];
  cover_image: string | null;
  tags: string[];
  read_time: string | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  seo_description: string | null;
  og_image: string | null;
  created_at: string;
  updated_at: string;
};

export type DanceMediaRow = {
  id: string;
  kind: "video" | "photo";
  url: string;
  caption: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
};

export type BattleRow = {
  id: string;
  year: string;
  event: string;
  result: string | null;
  sort_order: number;
  created_at: string;
};

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  project_type: string | null;
  budget: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  name: string;
  tagline: string | null;
  bio: string | null;
  avatar_url: string | null;
  resume_url: string | null;
  availability_status: string | null;
  socials: { label: string; url: string }[];
  updated_at: string;
};

export type LinkItemRow = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  emoji: string | null;
  highlight: boolean;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
};

export type SiteSettingsRow = {
  id: string;
  accent_color: string;
  site_title: string;
  site_description: string;
  logo_url: string | null;
  logo_type: "text" | "image";
  logo_text: string;
  hero_media_type: "none" | "image" | "video" | "youtube";
  hero_media_url: string | null;
  nav_links: { label: string; href: string }[];
  hero_eyebrow: string;
  hero_intro: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  marquee_items: string[];
  stats: { value: number; suffix: string; label: string }[];
  work_section_eyebrow: string;
  work_section_title: string;
  services_section_eyebrow: string;
  services_section_title: string;
  testimonials_section_eyebrow: string;
  testimonials_section_title: string;
  about_headline: string;
  about_timeline: { year: string; label: string; detail: string }[];
  about_skills: string[];
  footer_heading: string;
  footer_subtext: string;
  contact_email: string;
  services_availability_heading: string;
  services_availability_label: string;
  process_section_eyebrow: string;
  process_section_title: string;
  process_steps: { title: string; description: string }[];
  updated_at: string;
};
