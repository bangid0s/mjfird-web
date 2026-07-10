import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import type { InquiryRow } from "@/lib/supabase/types";

const QUICK_ACTIONS = [
  { href: "/admin/projects/new", label: "New project" },
  { href: "/admin/blog/new", label: "New post" },
  { href: "/admin/testimonials/new", label: "New testimonial" },
  { href: "/admin/settings", label: "Site settings" },
];

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
  ]);

  const stats = [
    {
      label: "Projects",
      count: projects.count ?? 0,
      hint: projectDrafts.count ? `${projectDrafts.count} draft${projectDrafts.count === 1 ? "" : "s"}` : null,
      href: "/admin/projects",
    },
    {
      label: "Blog posts",
      count: blogPosts.count ?? 0,
      hint: blogDrafts.count ? `${blogDrafts.count} draft${blogDrafts.count === 1 ? "" : "s"}` : null,
      href: "/admin/blog",
    },
    { label: "Services", count: services.count ?? 0, hint: null, href: "/admin/services" },
    { label: "Testimonials", count: testimonials.count ?? 0, hint: null, href: "/admin/testimonials" },
    {
      label: "Inquiries",
      count: inquiries.count ?? 0,
      hint: newInquiries.count ? `${newInquiries.count} new` : null,
      href: "/admin/inquiries",
      highlight: Boolean(newInquiries.count),
    },
  ];

  const latest = (recentInquiries.data as InquiryRow[]) ?? [];

  return (
    <div>
      <div className="mb-10">
        <p className="mb-1 font-mono text-label uppercase tracking-[0.25em] text-accent">Dashboard</p>
        <h1 className="font-display text-display-sm uppercase text-ink">
          What&apos;s moving
        </h1>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group flex flex-col gap-1 bg-bg p-5 transition-colors hover:bg-bg-raised"
          >
            <span className="font-display text-display-sm leading-none text-ink">{stat.count}</span>
            <span className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted">
              {stat.label}
            </span>
            <span
              className={cn(
                "mt-1 font-mono text-[10px] uppercase tracking-[0.1em]",
                stat.highlight ? "text-accent" : "text-ink-faint",
              )}
            >
              {stat.hint ?? " "}
            </span>
          </Link>
        ))}
      </div>

      <div className="mb-12">
        <h2 className="mb-4 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="border border-line px-4 py-2.5 font-mono text-label uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              {action.label} →
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
            Latest inquiries
          </h2>
          <Link
            href="/admin/inquiries"
            className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
          >
            View all →
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className="border-t border-line py-8 font-mono text-body-sm text-ink-muted">
            No inquiries yet — they&apos;ll land here when the contact form is used.
          </p>
        ) : (
          <div className="flex flex-col">
            {latest.map((inquiry) => (
              <Link
                key={inquiry.id}
                href="/admin/inquiries"
                className={cn(
                  "flex items-center justify-between gap-4 border-t border-line px-2 py-4 transition-colors last:border-b hover:bg-bg-raised/60",
                  inquiry.status === "new" && "bg-bg-raised/40",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="truncate font-body text-body-sm text-ink">{inquiry.name}</span>
                    {inquiry.status === "new" && (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] text-accent-ink">
                        new
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-body text-label text-ink-muted">
                    {inquiry.message}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-label text-ink-faint">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    {inquiry.budget}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
