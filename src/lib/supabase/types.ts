export type ContentStatus = "draft" | "scheduled" | "published";
export type CaseStudyTemplate = "editorial" | "immersive" | "systems";
/** How a cover image is framed — see `CoverMedia`. */
export type CoverFit = "cover" | "contain" | "natural" | "stretch";
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
  image_url: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  // Commission storefront (0028_service_storefront.sql)
  slug: string;
  category: string;
  details: string;
  availability: "open" | "waitlist" | "closed";
  slots_total: number | null;
  slots_taken: number;
  packages: unknown;
  addons: unknown;
  samples: unknown;
  will_draw: string[];
  wont_draw: string[];
  faq: unknown;
  terms: string;
  questions: unknown;
  /** [{ id: personal|monetized|commercial, name, description, percent, enabled }] */
  licenses?: unknown;
  /** [{ id, name, description, price }] — pick exactly one; the first is the default. */
  backgrounds?: unknown;
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
  /** Set only for verified reviews written by a client from a completed request. */
  request_id: string | null;
  service_id: string | null;
  service_title: string | null;
  rating: number | null;
  public_consent: boolean;
  submitted_at: string | null;
  updated_at: string | null;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: unknown[];
  cover_image: string | null;
  cover_fit: CoverFit;
  cover_focal_point: { x: number; y: number };
  /** Natural width ÷ height of the cover, measured in the admin. 0 = unknown. */
  cover_aspect: number;
  gallery: { url: string; alt?: string }[];
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

export type ResumeEntryKind = "experience" | "education" | "award";

export type ResumeEntryRow = {
  id: string;
  kind: ResumeEntryKind;
  role: string;
  organization: string | null;
  period: string | null;
  location: string | null;
  summary: string | null;
  bullets: string[];
  sort_order: number;
  status: ContentStatus;
  created_at: string;
};

export type ResumeToolRow = {
  id: string;
  name: string;
  icon_url: string | null;
  note: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
};

export type GalleryItemRow = {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
  link_url: string | null;
  tags: string[];
  /** Services this image is a sample of (migration 0039). */
  service_ids?: string[];
  /** "Made for …" credit. */
  client_name?: string | null;
  /** Review shown with the image; verified when the review itself is. */
  testimonial_id?: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
};

export type LinkPageTab = "links" | "shop";
export type LinkTileSize = "small" | "wide" | "tall" | "large";

export type LinkItemRow = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  emoji: string | null;
  image_url: string | null;
  size: LinkTileSize;
  highlight: boolean;
  tab: LinkPageTab;
  section: string | null;
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
  logo_url_light: string | null;
  logo_type: "text" | "image";
  logo_text: string;
  favicon_url: string | null;
  share_image_mode: "auto" | "custom";
  share_image_url: string | null;
  share_title: string;
  share_description: string;
  share_card_eyebrow: string;
  share_card_headline: string;
  share_card_bg_url: string | null;
  share_card_overlay_opacity: number;
  share_twitter_handle: string;
  ga_measurement_id: string;
  hero_media_type: "none" | "image" | "video" | "youtube";
  hero_media_url: string | null;
  // Hero slides. Everything past `url` is optional per-slide copy that falls
  // back to the hero_* columns below when blank.
  hero_media_urls: {
    url: string;
    alt?: string;
    eyebrow?: string;
    intro?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }[];
  hero_overlay_opacity: number;
  hero_animation: "none" | "zoom" | "drift" | "pulse";
  hero_slide_duration: number;
  dance_section_eyebrow: string;
  dance_section_title: string;
  dance_intro: string;
  about_description: string;
  links_bg_type: "none" | "image" | "video" | "youtube";
  links_bg_url: string | null;
  links_overlay_opacity: number;
  links_window_title: string;
  links_headline: string;
  links_run_by: string;
  links_intro: string;
  links_cta_label: string;
  links_cta_url: string;
  links_show_status: boolean;
  links_timezone: string;
  links_open_time: string;
  links_close_time: string;
  links_open_days: string;
  links_brands: { name: string; logoUrl?: string; note?: string; url?: string }[];
  links_brand_slots: number;
  links_brand_cta_url: string;
  links_tags: string[];
  nav_links: { label: string; href: string }[];
  hero_eyebrow: string;
  hero_intro: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  /** Added in migration 0041; blank means the default destination. */
  hero_cta_primary_url?: string | null;
  hero_cta_secondary_url?: string | null;
  // Added by migration 0042 — optional because a row may predate it.
  hero_style?: string | null;
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
  about_cta_label: string;
  about_cta_url: string;
  footer_heading: string;
  footer_subtext: string;
  contact_email: string;
  services_availability_heading: string;
  services_availability_label: string;
  process_section_eyebrow: string;
  process_section_title: string;
  process_steps: { title: string; description: string }[];
  // Added by migration 0034 — optional because a row may predate it.
  hero_headline?: string | null;
  hero_proof_note?: string | null;
  services_faq?: { q: string; a: string }[] | null;
  retainer_enabled?: boolean | null;
  retainer_eyebrow?: string | null;
  retainer_title?: string | null;
  retainer_intro?: string | null;
  retainer_points?: string[] | null;
  retainer_price_label?: string | null;
  retainer_cta_label?: string | null;
  resume_headline: string;
  resume_role: string;
  resume_location: string;
  resume_summary: string;
  resume_email: string;
  resume_skills: string[];
  resume_pdf_url: string;
  resume_graphic_portfolio_label: string;
  resume_graphic_portfolio_url: string;
  resume_illustration_portfolio_label: string;
  resume_illustration_portfolio_url: string;
  resume_photo_url: string;
  resume_languages: { name: string; level?: string }[];
  gallery_headline: string;
  gallery_intro: string;
  updated_at: string;
};

// ---------- Commission requests (0029_commission_requests.sql) ----------
export type CommissionStatus =
  | "pending"
  | "awaiting_payment"
  | "in_progress"
  | "delivered"
  | "completed"
  | "declined"
  | "cancelled";

export type CommissionAnswer = { id: string; label: string; value: string | string[] };

export type CommissionRequestRow = {
  id: string;
  ref: number;
  client_id: string;
  service_id: string | null;
  service_title: string;
  service_slug: string;
  package_id: string;
  package_name: string;
  package_price: number | string;
  /** Characters on top of the one the package includes (each billed at package_price). */
  extra_characters: number;
  delivery_days: number | null;
  revisions: number | null;
  addons: { id: string; name: string; price: number | string }[];
  /** Null when the service offered no background choice. */
  background_id: string | null;
  background_name: string | null;
  background_price: number | string;
  license_id: "personal" | "monetized" | "commercial";
  license_name: string;
  license_percent: number | string;
  /** license_percent of (package × characters + add-ons + background). */
  license_fee: number | string;
  estimated_total: number | string;
  final_price: number | string | null;
  currency: string;
  status: CommissionStatus;
  waitlisted: boolean;
  contact_name: string;
  contact_email: string;
  brief: string;
  answers: CommissionAnswer[];
  reference_paths: string[];
  delivery_paths: string[];
  /** Drop link (Drive, Dropbox, …) for finished files. Added in migration 0040. */
  delivery_url?: string | null;
  artist_note: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  payment_url: string | null;
  payment_url_set_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
};

export type CommissionMessageRow = {
  id: string;
  request_id: string;
  author_id: string | null;
  from_admin: boolean;
  body: string;
  created_at: string;
};
