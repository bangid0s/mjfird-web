"use client";

import {
  updateResumeEntry,
  deleteResumeEntry,
  reorderResumeEntries,
} from "@/lib/admin/resume-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import { RESUME_KINDS } from "@/lib/data/resume";
import type { ResumeEntryRow } from "@/lib/supabase/types";

export default function ResumeEntriesList({ entries }: { entries: ResumeEntryRow[] }) {
  return (
    <ReorderableList
      items={entries}
      onReorder={reorderResumeEntries}
      renderRow={(entry) => (
        <div className="flex items-start gap-3">
          <form action={updateResumeEntry.bind(null, entry.id)} className="flex flex-1 flex-col gap-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[7rem_1.3fr_1fr_9rem_9rem]">
              <select
                name="kind"
                defaultValue={entry.kind}
                aria-label="Kind"
                className={fieldInputClasses}
              >
                {RESUME_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
              <input
                name="role"
                defaultValue={entry.role}
                placeholder="Role or qualification"
                aria-label="Role"
                className={fieldInputClasses}
              />
              <input
                name="organization"
                defaultValue={entry.organization ?? ""}
                placeholder="Company or school"
                aria-label="Organization"
                className={fieldInputClasses}
              />
              <input
                name="period"
                defaultValue={entry.period ?? ""}
                placeholder="2021 — Present"
                aria-label="Period"
                className={fieldInputClasses}
              />
              <input
                name="location"
                defaultValue={entry.location ?? ""}
                placeholder="Remote"
                aria-label="Location"
                className={fieldInputClasses}
              />
            </div>

            <input
              name="summary"
              defaultValue={entry.summary ?? ""}
              placeholder="One line under the role (optional)"
              aria-label="Summary"
              className={fieldInputClasses}
            />

            <div className="grid gap-3 lg:grid-cols-[1fr_8rem_auto]">
              <textarea
                name="bullets"
                rows={2}
                defaultValue={(entry.bullets ?? []).join("\n")}
                placeholder="Detail bullets — one per line"
                aria-label="Bullets"
                className={`${fieldInputClasses} resize-none`}
              />
              <select
                name="status"
                defaultValue={entry.status}
                aria-label="Status"
                className={fieldInputClasses}
              >
                <option value="published">Live</option>
                <option value="draft">Hidden</option>
              </select>
              <button
                type="submit"
                className="self-end pb-3 font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
              >
                Save
              </button>
            </div>
          </form>
          <DeleteButton action={deleteResumeEntry.bind(null, entry.id)} />
        </div>
      )}
    />
  );
}
