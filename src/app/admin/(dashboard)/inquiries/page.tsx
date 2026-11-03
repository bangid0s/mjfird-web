import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setInquiryStatus, deleteInquiry } from "@/lib/admin/inquiries-actions";
import { cn } from "@/lib/cn";
import { formatDate, initials, timeAgo } from "@/lib/admin/format";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import DeleteButton from "@/components/admin/DeleteButton";
import type { InquiryRow, InquiryStatus } from "@/lib/supabase/types";

const FILTERS: { value: InquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

const STATUS_ACTIONS: { status: InquiryStatus; label: string }[] = [
  { status: "new", label: "Mark unread" },
  { status: "read", label: "Mark read" },
  { status: "archived", label: "Archive" },
];

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const filter = FILTERS.some((f) => f.value === rawStatus) ? (rawStatus as InquiryStatus | "all") : "all";

  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  const all = (data as InquiryRow[]) ?? [];
  const counts = {
    all: all.length,
    new: all.filter((i) => i.status === "new").length,
    read: all.filter((i) => i.status === "read").length,
    archived: all.filter((i) => i.status === "archived").length,
  };
  const inquiries = filter === "all" ? all : all.filter((i) => i.status === filter);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Inquiries"
        description="Everything sent through the contact form. Reply straight from here — the email opens with the subject filled in."
      />

      {all.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          description="When someone fills in the contact form, it lands here — and you'll see a badge in the sidebar."
        />
      ) : (
        <>
          <div role="tablist" aria-label="Filter inquiries" className="mb-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <Link
                  key={f.value}
                  role="tab"
                  aria-selected={active}
                  href={f.value === "all" ? "/admin/inquiries" : `/admin/inquiries?status=${f.value}`}
                  className={cn(
                    "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-body-sm transition-colors",
                    active
                      ? "border-accent font-medium text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "min-w-5 px-1.5 text-center font-mono text-[11px]",
                      active ? "bg-ink text-bg" : "bg-bg-raised-2 text-ink-muted",
                    )}
                  >
                    {counts[f.value]}
                  </span>
                </Link>
              );
            })}
          </div>

          {inquiries.length === 0 ? (
            <p className="border border-dashed border-line-strong px-6 py-12 text-center text-body-sm text-ink-muted">
              Nothing here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {inquiries.map((inquiry) => {
                const isNew = inquiry.status === "new";
                const subject = encodeURIComponent(
                  `Re: your ${inquiry.project_type ? inquiry.project_type.toLowerCase() + " " : ""}inquiry`,
                );
                return (
                  <li
                    key={inquiry.id}
                    className={cn(
                      "relative border bg-bg-raised/50 p-5 transition-colors sm:p-6",
                      isNew ? "border-accent/40" : "border-line",
                      inquiry.status === "archived" && "opacity-70",
                    )}
                  >
                    {isNew && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
                    <div className="flex items-start gap-4">
                      <span
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center text-[13px] font-semibold",
                          isNew ? "bg-accent text-accent-ink" : "border border-line bg-bg text-ink-muted",
                        )}
                      >
                        {initials(inquiry.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="flex items-center gap-2 text-body font-medium text-ink">
                            {inquiry.name}
                            {isNew && (
                              <span className="bg-accent px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em] text-accent-ink">
                                New
                              </span>
                            )}
                          </p>
                          <time
                            dateTime={inquiry.created_at}
                            title={formatDate(inquiry.created_at)}
                            className="text-[12px] text-ink-faint"
                          >
                            {timeAgo(inquiry.created_at)}
                          </time>
                        </div>
                        <a
                          href={`mailto:${inquiry.email}`}
                          className="text-body-sm text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
                        >
                          {inquiry.email}
                        </a>

                        {(inquiry.project_type || inquiry.budget) && (
                          <dl className="mt-4 flex flex-wrap gap-2">
                            {inquiry.project_type && (
                              <div className="border border-line bg-bg px-2.5 py-1 text-[12px]">
                                <dt className="sr-only">Project type</dt>
                                <dd className="text-ink">{inquiry.project_type}</dd>
                              </div>
                            )}
                            {inquiry.budget && (
                              <div className="border border-line bg-bg px-2.5 py-1 text-[12px]">
                                <dt className="sr-only">Budget</dt>
                                <dd className="font-mono text-ink">{inquiry.budget}</dd>
                              </div>
                            )}
                          </dl>
                        )}

                        <p className="mt-4 whitespace-pre-line text-body-sm leading-relaxed text-pretty text-ink">
                          {inquiry.message}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                          <a
                            href={`mailto:${inquiry.email}?subject=${subject}`}
                            className="inline-flex items-center gap-2 bg-accent px-3.5 py-2 text-body-sm font-medium text-accent-ink transition-[filter] hover:brightness-110"
                          >
                            Reply by email
                          </a>
                          {STATUS_ACTIONS.filter((a) => a.status !== inquiry.status).map((action) => (
                            <form key={action.status} action={setInquiryStatus.bind(null, inquiry.id, action.status)}>
                              <button
                                type="submit"
                                className="border border-line px-3.5 py-2 text-body-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                              >
                                {action.label}
                              </button>
                            </form>
                          ))}
                          <span className="ml-auto">
                            <DeleteButton action={deleteInquiry.bind(null, inquiry.id)} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
