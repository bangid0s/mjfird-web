"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/admin/auth-actions";
import { cn } from "@/lib/cn";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CommandPalette from "@/components/admin/CommandPalette";
import { ADMIN_NAV, findNavItem, isActive } from "@/components/admin/admin-nav";
import { ExternalIcon, SearchIcon, SignOutIcon } from "@/components/admin/AdminIcons";

/*
  The admin is a tool, not a poster, so it trades the public site's
  letterspaced micro-caps for plain sentence-case UI type: thirteen sections
  in 12px spaced capitals is a wall to scan. The sheet, the hairlines and the
  single accent stay, so it still reads as the same studio.
*/

function BrandMark() {
  return (
    <Link href="/admin" className="group flex items-center gap-3 px-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center bg-accent font-display text-sm font-semibold tracking-[-0.04em] text-accent-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:-rotate-6">
        M
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[15px] font-semibold tracking-[-0.03em] text-ink">MJFIRD</span>
        <span className="text-[11px] text-ink-faint">Studio admin</span>
      </span>
    </Link>
  );
}

function SearchTrigger({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex items-center gap-2.5 border border-line bg-bg px-3 py-2 text-left text-body-sm text-ink-faint transition-colors duration-[var(--duration-fast)] hover:border-line-strong hover:text-ink-muted",
        className,
      )}
    >
      <SearchIcon className="h-4 w-4 shrink-0" />
      <span className="flex-1">Jump to…</span>
      <kbd className="border border-line px-1.5 py-px font-mono text-[10px] text-ink-faint">⌘K</kbd>
    </button>
  );
}

function NavLinks({
  pathname,
  newInquiries,
  newRequests,
  onNavigate,
}: {
  pathname: string;
  newInquiries: number;
  newRequests: number;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {ADMIN_NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const badge =
              item.href === "/admin/inquiries" ? newInquiries : item.href === "/admin/requests" ? newRequests : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-[7px] text-body-sm transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "bg-bg-raised font-medium text-ink"
                    : "text-ink-muted hover:bg-bg-raised/70 hover:text-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1.5 left-0 w-0.5 bg-accent transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                    active ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted",
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-5 bg-accent px-1.5 py-px text-center font-mono text-[10px] font-medium text-accent-ink">
                    {badge}
                    <span className="sr-only"> new</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ userEmail }: { userEmail?: string | null }) {
  const initial = (userEmail?.[0] ?? "M").toUpperCase();
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex items-center gap-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center gap-2 px-3 py-2 text-body-sm text-ink-muted transition-colors hover:bg-bg-raised/70 hover:text-ink"
        >
          <ExternalIcon className="h-4 w-4 text-ink-faint" />
          View live site
        </a>
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-3 px-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center border border-line bg-bg-raised font-display text-sm font-semibold text-ink">
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-muted" title={userEmail ?? undefined}>
          {userEmail ?? "Signed in"}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="grid h-8 w-8 place-items-center text-ink-faint transition-colors hover:bg-bg-raised hover:text-error"
          >
            <SignOutIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminShell({
  children,
  newInquiries = 0,
  newRequests = 0,
  userEmail,
}: {
  children: React.ReactNode;
  newInquiries?: number;
  newRequests?: number;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const crumb = findNavItem(pathname);
  const isSubPage = crumb && crumb.item.href !== pathname;

  // Close the drawer on navigation (including back/forward).
  const [drawerRoute, setDrawerRoute] = useState(pathname);
  if (drawerRoute !== pathname) {
    setDrawerRoute(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line lg:flex">
        <div className="flex shrink-0 flex-col gap-5 px-3 pb-4 pt-5">
          <BrandMark />
          <SearchTrigger onOpen={() => setPaletteOpen(true)} className="mx-1" />
        </div>
        {/* Only the list scrolls, so the account row never falls off a short screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <NavLinks pathname={pathname} newInquiries={newInquiries} newRequests={newRequests} />
        </div>
        <div className="shrink-0 px-3 pb-4">
          <SidebarFooter userEmail={userEmail} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-[var(--z-nav)] flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur-md lg:hidden">
        <BrandMark />
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search admin"
            onClick={() => setPaletteOpen(true)}
            className="grid h-10 w-10 place-items-center text-ink-muted hover:text-ink"
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative grid h-10 w-10 place-items-center"
          >
            <span className="relative block h-3 w-5">
              <span
                className={cn(
                  "absolute left-0 block h-px w-5 bg-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                  open ? "top-[6px] rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-px w-5 bg-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                  open ? "top-[6px] -rotate-45" : "top-[11px]",
                )}
              />
            </span>
            {newInquiries + newRequests > 0 && !open && (
              <span className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 top-14 z-[var(--z-nav)] lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-[var(--duration-base)]",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          inert={!open}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col gap-6 overflow-y-auto border-r border-line bg-bg px-3 py-6 transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <NavLinks pathname={pathname} newInquiries={newInquiries} newRequests={newRequests} onNavigate={() => setOpen(false)} />
          <SidebarFooter userEmail={userEmail} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar: where am I, and the way out to the live site. */}
        <header className="sticky top-0 z-[var(--z-nav)] hidden h-14 items-center justify-between gap-4 border-b border-line bg-bg/85 px-8 backdrop-blur-md lg:flex xl:px-12">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-body-sm">
            <span className="text-ink-faint">{crumb?.group ?? "Admin"}</span>
            <span className="text-ink-faint" aria-hidden="true">/</span>
            {crumb && isSubPage ? (
              <>
                <Link href={crumb.item.href} className="text-ink-muted transition-colors hover:text-ink">
                  {crumb.item.label}
                </Link>
                <span className="text-ink-faint" aria-hidden="true">/</span>
                <span className="truncate font-medium text-ink">
                  {pathname.endsWith("/new") ? "New" : "Edit"}
                </span>
              </>
            ) : (
              <span className="truncate font-medium text-ink">{crumb?.item.label ?? "Admin"}</span>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <SearchTrigger onOpen={() => setPaletteOpen(true)} className="w-56" />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-20 sm:px-8 lg:px-8 lg:pt-10 xl:px-12">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
