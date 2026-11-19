import Link from "next/link";
import { signOutClient } from "@/lib/client/auth-actions";
import { cn } from "@/lib/cn";

/*
  The frame every account page shares: who you are, and tabs to move between
  your requests and your settings. The account is a tool, so it uses the
  sentence-case .label face rather than the site's letterspaced spec caps.
*/

export type AccountTab = "requests" | "profile" | "password";

export default function AccountShell({
  active,
  name,
  email,
  showPassword,
  openCount,
  children,
}: {
  active: AccountTab;
  name: string | null;
  email: string;
  /** Google accounts have no password to change. */
  showPassword: boolean;
  /** Requests still in motion, shown on the Requests tab. */
  openCount?: number;
  children: React.ReactNode;
}) {
  const tabs = [
    { id: "requests" as const, label: "Requests", href: "/account", count: openCount },
    { id: "profile" as const, label: "Profile", href: "/account/profile" },
    ...(showPassword ? [{ id: "password" as const, label: "Password", href: "/account/password" }] : []),
  ];

  return (
    <div className="container-page pb-[var(--space-section)] pt-12 sm:pt-16">
      <header className="flex flex-col gap-2">
        <h1 className="display-md">{name ? `Hi, ${name}` : "Your account"}</h1>
        <p className="meta">{email}</p>
      </header>

      <div className="mt-8 flex items-end justify-between gap-6 border-b border-line">
        <nav aria-label="Account" className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const current = tab.id === active;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "label flex shrink-0 items-center gap-2 border-b-2 pb-3 transition-colors",
                  current ? "border-accent text-ink" : "border-transparent hover:text-ink",
                )}
              >
                {tab.label}
                {tab.count ? (
                  <span className="min-w-5 rounded-full bg-bg-raised-2 px-1.5 text-center text-[12px] tabular-nums text-ink-muted">
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <form action={signOutClient} className="shrink-0 pb-3">
          <button type="submit" className="label transition-colors hover:text-ink">
            Sign out
          </button>
        </form>
      </div>

      <div className="pt-10">{children}</div>
    </div>
  );
}
