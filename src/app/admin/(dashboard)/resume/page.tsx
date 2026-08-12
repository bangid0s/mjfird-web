import { createClient } from "@/lib/supabase/server";
import { createResumeEntry } from "@/lib/admin/resume-actions";
import { getSiteSettings } from "@/lib/data/site-settings";
import { RESUME_KINDS } from "@/lib/data/resume";
import { fieldInputClasses } from "@/components/admin/Field";
import ResumeEntriesList from "@/components/admin/ResumeEntriesList";
import ResumePanel from "@/components/admin/ResumePanel";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SubmitButton from "@/components/admin/SubmitButton";
import type { ResumeEntryRow } from "@/lib/supabase/types";

export default async function AdminResumePage() {
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("resume_entries").select("*").order("sort_order", { ascending: true }),
    getSiteSettings(),
  ]);

  const entries = (data as ResumeEntryRow[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Resume"
        description="The standalone resume at /resume — no site nav, just the page. Add one row per job, school or award; the page groups them into Experience, Education and Awards for you, and rows drag to reorder within a group."
        action={
          <a
            href="/resume"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-5 py-2.5 font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            Preview /resume →
          </a>
        }
      />

      <ResumePanel settings={settings} />

      <form action={createResumeEntry} className="mb-10 flex flex-col gap-3 border border-line p-4">
        <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[7rem_1.3fr_1fr_9rem_9rem]">
          <select name="kind" defaultValue="experience" aria-label="Kind" className={fieldInputClasses}>
            {RESUME_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
          <input name="role" required placeholder="Role or qualification" aria-label="Role" className={fieldInputClasses} />
          <input name="organization" placeholder="Company or school" aria-label="Organization" className={fieldInputClasses} />
          <input name="period" placeholder="2021 — Present" aria-label="Period" className={fieldInputClasses} />
          <input name="location" placeholder="Remote" aria-label="Location" className={fieldInputClasses} />
        </div>

        <div className="grid items-end gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <input name="summary" placeholder="One line under the role (optional)" aria-label="Summary" className={fieldInputClasses} />
          <textarea
            name="bullets"
            rows={2}
            placeholder="Detail bullets — one per line"
            aria-label="Bullets"
            className={`${fieldInputClasses} resize-none`}
          />
          <SubmitButton pendingLabel="Adding…">Add entry</SubmitButton>
        </div>
      </form>

      {entries.length === 0 ? (
        <EmptyState
          title="No resume entries yet"
          description="Add your first role above. Education and awards use the same form — just switch the kind."
        />
      ) : (
        <ResumeEntriesList entries={entries} />
      )}
    </div>
  );
}
