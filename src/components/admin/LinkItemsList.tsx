"use client";

import { updateLinkItem, deleteLinkItem, reorderLinkItems } from "@/lib/admin/links-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import type { LinkItemRow } from "@/lib/supabase/types";

export default function LinkItemsList({ items }: { items: LinkItemRow[] }) {
  return (
    <ReorderableList
      items={items}
      onReorder={reorderLinkItems}
      renderRow={(item) => (
        <div className="flex items-center gap-3">
          <form
            action={updateLinkItem.bind(null, item.id)}
            className="grid flex-1 grid-cols-2 items-center gap-3 lg:grid-cols-[3rem_1fr_1.4fr_1fr_auto_6.5rem_auto]"
          >
            <input
              name="emoji"
              defaultValue={item.emoji ?? ""}
              placeholder="⚡"
              aria-label="Emoji"
              className={`${fieldInputClasses} text-center`}
            />
            <input
              name="label"
              defaultValue={item.label}
              placeholder="Button label"
              aria-label="Label"
              className={fieldInputClasses}
            />
            <input
              name="url"
              defaultValue={item.url}
              placeholder="https://… or /work"
              aria-label="URL"
              className={fieldInputClasses}
            />
            <input
              name="description"
              defaultValue={item.description ?? ""}
              placeholder="Small sub-line (optional)"
              aria-label="Description"
              className={fieldInputClasses}
            />
            <label className="flex items-center gap-2 font-mono text-label uppercase tracking-[0.1em] text-ink-muted">
              <input
                type="checkbox"
                name="highlight"
                defaultChecked={item.highlight}
                className="h-4 w-4 accent-accent"
              />
              Accent
            </label>
            <select name="status" defaultValue={item.status} aria-label="Status" className={fieldInputClasses}>
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
          <DeleteButton action={deleteLinkItem.bind(null, item.id)} />
        </div>
      )}
    />
  );
}
