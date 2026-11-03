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
      { href: "/admin/inquiries", label: "Inquiries", icon: InquiriesIcon, keywords: "leads inbox clients contact" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/projects", label: "Projects", icon: ProjectsIcon, keywords: "work case study portfolio" },
      { href: "/admin/services", label: "Services", icon: ServicesIcon, keywords: "offer pricing" },
      { href: "/admin/blog", label: "Blog", icon: BlogIcon, keywords: "posts articles writing" },
      { href: "/admin/testimonials", label: "Testimonials", icon: TestimonialsIcon, keywords: "quotes reviews" },
      { href: "/admin/dance", label: "Dance", icon: DanceIcon, keywords: "battles videos breaking" },
    ],
  },
  {
    label: "Pages",
    items: [
      { href: "/admin/links", label: "Links page", icon: LinkIcon, keywords: "bio link in bio" },
      { href: "/admin/resume", label: "Resume page", icon: ResumeIcon, keywords: "cv experience" },
      { href: "/admin/gallery", label: "Gallery page", icon: GalleryIcon, keywords: "images art" },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/admin/media", label: "Files", icon: MediaIcon, keywords: "media uploads storage images" },
      { href: "/admin/profile", label: "Profile", icon: ProfileIcon, keywords: "bio about socials availability" },
      { href: "/admin/settings", label: "Site settings", icon: SettingsIcon, keywords: "hero logo seo theme colour" },
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
