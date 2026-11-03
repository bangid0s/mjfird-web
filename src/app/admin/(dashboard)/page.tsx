import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { greeting, initials, timeAgo } from "@/lib/admin/format";
import type { InquiryRow } from "@/lib/supabase/types";
import {
  ArrowRightIcon,
  BlogIcon,
  CheckIcon,
  ExternalIcon,
  InquiriesIcon,
  PlusIcon,
  ProjectsIcon,
  SearchIcon,
  ServicesIcon,
  TestimonialsIcon,
} from "@/components/admin/AdminIcons";
import { ADMIN_CREATE_ACTIONS } from "@/components/admin/admin-nav";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const count = (table: string, filters?: Record<string, string>) => {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    for (const [key, value] of Object.entries(filters ?? {})) {
      query = query.eq(key, value);
    }
    return query;
  };

  const [
    projects,
    projectDrafts,
    services,
    blogPosts,
    blogDrafts,
    testimonials,
    inquiries,
    newInquiries,
    recentInquiries,
    profile,
  ] = await Promise.all([
    count("projects"),
    count("projects", { status: "draft" }),
    count("services"),
    count("blog_posts"),
    count("blog_posts", { status: "draft" }),
    count("testimonials"),
    count("inquiries"),
    count("inquiries", { status: "new" }),
    supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("profile").select("name").limit(1).maybeSingle(),
  ]);

  const n = (r: { count: number | null }) => r.count ?? 0;
  const plural = (value: number, one: string, many = `${one}s`) => `${value} ${value === 1 ? one : many}`;

  const stats = [
    { label: "Projects", value: n(projects), hint: n(projectDrafts) ? `${n(projectDrafts)} in draft` : "All live", href: "/admin/projects", icon: ProjectsIcon },
    { label: "Blog posts", value: n(blogPosts), hint: n(blogDrafts) ? `${n(blogDrafts)} in draft` : "All live", href: "/admin/blog", icon: BlogIcon },
    { label: "Services", value: n(services), hint: "On /services", href: "/admin/services", icon: ServicesIcon },
    { label: "Testimonials", value: n(testimonials), hint: "Social proof", href: "/admin/testimonials", icon: TestimonialsIcon },
  ];

  // The few things that actually want a decision today, in priority order.
  const attention = [
    n(newInquiries) > 0 && {
      href: "/admin/inquiries?status=new",
      title: plural(n(newInquiries), "new inquiry", "new inquiries"),
      body: "Potential clients waiting on a reply. Fast answers win retainers.",
      tone: "accent" as const,
    },
    n(projectDrafts) > 0 && {
      href: "/admin/projects",
      title: plural(n(projectDrafts), "project draft"),
      body: "Finished work that isn't on the site yet.",
      tone: "muted" as const,
    },
    n(blogDrafts) > 0 && {
      href: "/admin/blog",
      title: plural(n(blogDrafts), "post draft"),
      body: "Half-written posts — publish or clear them out.",
      tone: "muted" as const,
    },
    n(testimonials) < 3 && {
      href: "/admin/testimonials/new",
      title: "Add a testimonial",
      body: "Three or more quotes make the homepage section feel complete.",
      tone: "muted" as const,
    },
  ].filter(Boolean) as { href: string; title: string; body: string; tone: "accent" | "muted" }[];

  const latest = (recentInquiries.data as InquiryRow[]) ?? [];
  const firstName = (profile.data?.name as string | undefined)?.split(/[\s.]+/)[0];
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-12">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <p className="mb-2 text-body-sm text-ink-faint">{today}</p>
          <h1 className="display-md">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-3 max-w-lg text-body text-ink-muted">
            {n(newInquiries) > 0
              ? `You have ${plural(n(newInquiries), "unread inquiry", "unread inquiries")}. Everything else is below.`
              : "Inbox is clear. Here's how the studio looks today."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-line px-4 py-2.5 text-body-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-bg-raised"
          >
            <ExternalIcon className="h-4 w-4 text-ink-faint" />
            Live site
          </a>
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-body-sm font-medium text-accent-ink transition-[filter] hover:brightness-110"
          >
            <PlusIcon className="h-4 w-4" />
            New project
          </Link>
        </div>
      </div>

      {/* Inbox hero stat + content stats */}
      <div className="grid gap-px border border-line bg-line lg:grid-cols-[1.2fr_2fr]">
        <Link
          href="/admin/inquiries"
          className={cn(
            "group relative flex flex-col justify-between gap-8 p-6 transition-colors",
            n(newInquiries) > 0 ? "bg-accent text-accent-ink" : "bg-bg-raised hover:bg-bg-raised-2",
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("flex items-center gap-2 text-body-sm font-medium", n(newInquiries) > 0 ? "" : "text-ink-muted")}>
              <InquiriesIcon className="h-4 w-4" />
              Inquiries
            </span>
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1" />
          </div>
          <div>
            <p className="font-display text-[clamp(3rem,2rem+3vw,4.5rem)] font-semibold leading-none tracking-[-0.04em]">
              {n(newInquiries)}
            </p>
            <p className={cn("mt-2 text-body-sm", n(newInquiries) > 0 ? "opacity-85" : "text-ink-muted")}>
              new · {n(inquiries)} total received
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-px bg-line">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="group flex flex-col gap-4 bg-bg p-5 transition-colors hover:bg-bg-raised"
              >
                <span className="flex items-center justify-between text-body-sm text-ink-muted">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-ink-faint transition-colors group-hover:text-accent" />
                    {stat.label}
                  </span>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-ink-faint opacity-0 transition-[opacity,transform] duration-[var(--duration-base)] group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-[2.25rem] font-semibold leading-none tracking-[-0.03em] text-ink">
                    {stat.value}
                  </span>
                  <span className="text-[12px] text-ink-faint">{stat.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        {/* Latest inquiries */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-body font-semibold text-ink">Latest inquiries</h2>
            <Link
              href="/admin/inquiries"
              className="group inline-flex items-center gap-1.5 text-body-sm text-ink-muted hover:text-ink"
            >
              View all
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {latest.length === 0 ? (
            <div className="border border-dashed border-line-strong px-6 py-12 text-center">
              <p className="text-body-sm text-ink-muted">
                No inquiries yet — they&apos;ll land here when the contact form is used.
              </p>
            </div>
          ) : (
            <ul className="border border-line">
              {latest.map((inquiry) => (
                <li key={inquiry.id} className="border-t border-line first:border-t-0">
                  <Link
                    href="/admin/inquiries"
                    className="group flex items-start gap-4 px-4 py-4 transition-colors hover:bg-bg-raised"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center text-[12px] font-semibold",
                        inquiry.status === "new"
                          ? "bg-accent text-accent-ink"
                          : "border border-line bg-bg-raised text-ink-muted",
                      )}
                    >
                      {initials(inquiry.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-body-sm font-medium text-ink">{inquiry.name}</span>
                        {inquiry.status === "new" && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="new" />
                        )}
                        <span className="ml-auto shrink-0 text-[12px] text-ink-faint">
                          {timeAgo(inquiry.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-body-sm text-ink-muted">{inquiry.message}</p>
                      {(inquiry.project_type || inquiry.budget) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[inquiry.project_type, inquiry.budget].filter(Boolean).map((tag) => (
                            <span key={tag} className="border border-line px-1.5 py-px text-[11px] text-ink-muted">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Side column */}
        <aside className="flex flex-col gap-10">
          <section>
            <h2 className="mb-4 text-body font-semibold text-ink">Needs attention</h2>
            {attention.length === 0 ? (
              <p className="flex items-center gap-2 border border-line px-4 py-4 text-body-sm text-ink-muted">
                <CheckIcon className="h-4 w-4 text-success" />
                All clear. Nothing waiting on you.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {attention.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="group flex gap-3 border border-line px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-raised"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          item.tone === "accent" ? "bg-accent" : "bg-line-strong",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-body-sm font-medium text-ink">{item.title}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{item.body}</span>
                      </span>
                      <ArrowRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-body font-semibold text-ink">Create</h2>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_CREATE_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col gap-3 border border-line p-3.5 text-body-sm text-ink transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  <PlusIcon className="h-4 w-4 text-ink-faint transition-colors group-hover:text-accent" />
                  {action.label.replace("New ", "")}
                </Link>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-faint">
              <SearchIcon className="h-3.5 w-3.5" />
              Tip: press <kbd className="border border-line px-1 font-mono text-[11px]">⌘K</kbd> to jump anywhere.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
