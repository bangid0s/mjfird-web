import { createClient } from "@/lib/supabase/server";
import { setInquiryStatus } from "@/lib/admin/inquiries-actions";
import { cn } from "@/lib/cn";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import type { InquiryRow } from "@/lib/supabase/types";

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  const inquiries = (data as InquiryRow[]) ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Inquiries"
        description="Everything sent through the contact form. New ones are highlighted."
      />

      {inquiries.length === 0 && (
        <EmptyState
          title="No inquiries yet"
          description="When someone fills in the contact form, it lands here — and you'll see a badge in the sidebar."
        />
      )}

      <div className="flex flex-col">
        {inquiries.map((inquiry) => (
          <div
            key={inquiry.id}
            className={cn(
              "flex flex-col gap-3 border-t border-line py-6 last:border-b",
              inquiry.status === "new" && "bg-bg-raised/40",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-body text-body text-ink">{inquiry.name}</span>
                <a href={`mailto:${inquiry.email}`} className="font-mono text-label text-ink-muted hover:text-accent">
                  {inquiry.email}
                </a>
              </div>
              <time className="font-mono text-label text-ink-faint">
                {new Date(inquiry.created_at).toLocaleDateString()}
              </time>
            </div>
            <div className="flex gap-4 font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
              <span>{inquiry.project_type}</span>
              <span>{inquiry.budget}</span>
            </div>
            <p className="font-body text-body-sm text-ink-muted">{inquiry.message}</p>
            <div className="flex gap-4">
              {(["new", "read", "archived"] as const).map((status) => (
                <form key={status} action={setInquiryStatus.bind(null, inquiry.id, status)}>
                  <button
                    type="submit"
                    disabled={inquiry.status === status}
                    className={cn(
                      "font-mono text-label uppercase tracking-[0.1em]",
                      inquiry.status === status ? "text-accent" : "text-ink-faint hover:text-ink",
                    )}
                  >
                    {status}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
