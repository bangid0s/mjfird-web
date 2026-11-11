import {
  DashboardIcon,
  ProjectsIcon,
  ServicesIcon,
  BlogIcon,
  TestimonialsIcon,
  DanceIcon,
  InquiriesIcon,
  ProfileIcon,
  SettingsIcon,
  LinkIcon,
  MediaIcon,
  ResumeIcon,
  GalleryIcon,
  PlusIcon,
  RequestsIcon,
  HomeIcon,
  AboutIcon,
  PageTextIcon,
} from "@/components/admin/AdminIcons";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
  /** Extra words the command palette should match on. */
  keywords?: string;
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/*
  One list, grouped by what the admin is doing rather than alphabetically:
  the day-to-day inbox first, then the content that feeds the site, then the
  standalone pages, then the plumbing. The sidebar and the command palette
  both read from here, so a new section only has to be added once.
*/
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: DashboardIcon, keywords: "home overview stats" },
      { href: "/admin/requests", label: "Requests", icon: RequestsIcon, keywords: "commissions orders clients quotes" },
      { href: "/admin/inquiries", label: "Inquiries", icon: InquiriesIcon, keywords: "leads inbox clients contact" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/projects", label: "Projects", icon: ProjectsIcon, keywords: "work case study portfolio" },
      { href: "/admin/services", label: "Services", icon: ServicesIcon, keywords: "offer pricing packages commissions" },
      { href: "/admin/blog", label: "Blog", icon: BlogIcon, keywords: "posts articles writing" },
      { href: "/admin/testimonials", label: "Testimonials", icon: TestimonialsIcon, keywords: "quotes reviews" },
      { href: "/admin/dance", label: "Dance media", icon: DanceIcon, keywords: "battles videos breaking reel" },
    ],
  },
  {
    // One entry per public page: the text and settings that belong to that
    // page alone. Anything shared by every page is under Site settings.
    label: "Page text",
    items: [
      { href: "/admin/pages/home", label: "Home page", icon: HomeIcon, keywords: "homepage hero headline stats numbers section headings" },
      { href: "/admin/pages/about", label: "About page", icon: AboutIcon, keywords: "story timeline toolkit skills bio" },
      { href: "/admin/pages/services", label: "Services page", icon: PageTextIcon, keywords: "process steps faq questions retainer availability" },
      { href: "/admin/pages/dance", label: "Dance page", icon: PageTextIcon, keywords: "dance heading intro" },
      { href: "/admin/links", label: "Links page", icon: LinkIcon, keywords: "bio link in bio background studio hours" },
      { href: "/admin/resume", label: "Resume page", icon: ResumeIcon, keywords: "cv experience education tools" },
      { href: "/admin/gallery", label: "Gallery page", icon: GalleryIcon, keywords: "images art" },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/admin/media", label: "Files", icon: MediaIcon, keywords: "media uploads storage images client files references deliveries commission" },
      { href: "/admin/profile", label: "Profile", icon: ProfileIcon, keywords: "bio socials availability portrait" },
      { href: "/admin/settings", label: "Site settings", icon: SettingsIcon, keywords: "brand logo colour seo link preview analytics menu navigation footer email" },
    ],
  },
];

export const ADMIN_CREATE_ACTIONS: AdminNavItem[] = [
  { href: "/admin/projects/new", label: "New project", icon: PlusIcon, keywords: "create add work" },
  { href: "/admin/blog/new", label: "New blog post", icon: PlusIcon, keywords: "create add write" },
  { href: "/admin/services/new", label: "New service", icon: PlusIcon, keywords: "create add" },
  { href: "/admin/testimonials/new", label: "New testimonial", icon: PlusIcon, keywords: "create add quote" },
];

export function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
}

/** The nav item a path belongs to, for the top bar's breadcrumb. */
export function findNavItem(pathname: string): { group: string; item: AdminNavItem } | null {
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (item.href !== "/admin" && isActive(pathname, item.href)) return { group: group.label, item };
    }
  }
  return pathname === "/admin" ? { group: "Overview", item: ADMIN_NAV[0].items[0] } : null;
}
