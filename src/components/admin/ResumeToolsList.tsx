"use client";

import {
  updateResumeTool,
  deleteResumeTool,
  reorderResumeTools,
} from "@/lib/admin/resume-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import UploadInput from "@/components/admin/UploadInput";
import type { ResumeToolRow } from "@/lib/supabase/types";

export default function ResumeToolsList({ tools }: { tools: ResumeToolRow[] }) {
  return (
    <ReorderableList
      items={tools}
      onReorder={reorderResumeTools}
      renderRow={(tool) => (
        <div className="flex items-center gap-3">
          {tool.icon_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={tool.icon_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-md border border-line object-contain p-1"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line font-mono text-label text-ink-faint"
            >
              {tool.name.slice(0, 1)}
            </span>
          )}

          <form
            action={updateResumeTool.bind(null, tool.id)}
            className="grid flex-1 grid-cols-2 items-center gap-3 lg:grid-cols-[1fr_1.4fr_1fr_6.5rem_auto]"
          >
            <input
              name="name"
              defaultValue={tool.name}
              placeholder="Figma"
              aria-label="Tool name"
              className={fieldInputClasses}
            />
            <UploadInput
              name="icon_url"
              defaultValue={tool.icon_url ?? ""}
              ariaLabel="Icon"
              placeholder="Paste an icon address…"
            />
            <input
              name="note"
              defaultValue={tool.note ?? ""}
              placeholder="Daily driver (optional)"
              aria-label="Note"
              className={fieldInputClasses}
            />
            <select
              name="status"
              defaultValue={tool.status}
              aria-label="Status"
              className={fieldInputClasses}
            >
              <option value="published">Live</option>
              <option value="draft">Hidden</option>
            </select>
            <button
              type="submit"
              className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
            >
              Save
            </button>
          </form>
          <DeleteButton action={deleteResumeTool.bind(null, tool.id)} />
        </div>
      )}
    />
  );
}
