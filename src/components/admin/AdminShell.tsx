"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/admin/auth-actions";
import { cn } from "@/lib/cn";
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
  ExternalIcon,
} from "@/components/admin/AdminIcons";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/admin/services", label: "Services", icon: ServicesIcon },
  { href: "/admin/blog", label: "Blog", icon: BlogIcon },
  { href: "/admin/testimonials", label: "Testimonials", icon: TestimonialsIcon },
  { href: "/admin/dance", label: "Dance", icon: DanceIcon },
  { href: "/admin/inquiries", label: "Inquiries", icon: InquiriesIcon },
  { href: "/admin/links", label: "Links Page", icon: LinkIcon },
  { href: "/admin/profile", label: "Profile", icon: ProfileIcon },
  { href: "/admin/settings", label: "Site Settings", icon: SettingsIcon },
];

function NavLinks({
  pathname,
  newInquiries,
  onNavigate,
}: {
  pathname: string;
  newInquiries: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const IconComponent = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2.5 font-mono text-label uppercase tracking-[0.1em] transition-colors duration-[var(--duration-fast)]",
              active
                ? "bg-bg-raised text-ink"
                : "text-ink-muted hover:bg-bg-raised/60 hover:text-ink",
            )}
          >
            <span
              className={cn(
                "absolute inset-y-1.5 left-0 w-0.5 bg-accent transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <IconComponent
              className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted")}
            />
            <span className="flex-1">{item.label}</span>
            {item.href === "/admin/inquiries" && newInquiries > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-medium text-accent-ink">
                {newInquiries}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ userEmail }: { userEmail?: string | null }) {
  return (
    <div className="mt-auto flex flex-col gap-4 border-t border-line pt-6">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 font-mono text-label uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink"
      >
        <ExternalIcon className="h-3.5 w-3.5" />
        View site
      </a>
      <div className="flex items-center justify-between gap-2">
        {userEmail && (
          <span className="truncate font-mono text-[10px] text-ink-faint" title={userEmail}>
            {userEmail}
          </span>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="shrink-0 font-mono text-label uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-error"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminShell({
  children,
  newInquiries = 0,
  userEmail,
}: {
  children: React.ReactNode;
  newInquiries?: number;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-4 py-8 lg:flex">
        <Link href="/admin" className="mb-8 px-3 font-display text-xl uppercase text-ink">
          MJFIRD <span className="text-accent">/admin</span>
        </Link>
        <NavLinks pathname={pathname} newInquiries={newInquiries} />
        <SidebarFooter userEmail={userEmail} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-display text-lg uppercase text-ink" onClick={() => setOpen(false)}>
          MJFIRD <span className="text-accent">/admin</span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5"
        >
          <span
            className={cn(
              "block h-px w-5 bg-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
              open && "translate-y-[3.5px] rotate-45",
            )}
          />
          <span
            className={cn(
              "block h-px w-5 bg-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
              open && "-translate-y-[3.5px] -rotate-45",
            )}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[57px] z-40 flex flex-col overflow-y-auto bg-bg px-4 py-6 lg:hidden">
          <NavLinks pathname={pathname} newInquiries={newInquiries} onNavigate={() => setOpen(false)} />
          <SidebarFooter userEmail={userEmail} />
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-16 pt-20 sm:px-8 lg:px-12 lg:pt-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
