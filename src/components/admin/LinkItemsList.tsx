"use client";

import { updateLinkItem, deleteLinkItem, reorderLinkItems } from "@/lib/admin/links-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import UploadInput from "@/components/admin/UploadInput";
import { LINK_TILE_SIZES } from "@/lib/link-tiles";
import type { LinkItemRow } from "@/lib/supabase/types";

export const SECTION_LIST_ID = "link-sections";

export default function LinkItemsList({ items }: { items: LinkItemRow[] }) {
  return (
    <ReorderableList
      items={items}
      onReorder={reorderLinkItems}
      renderRow={(item) => (
        <div className="flex items-center gap-3">
          <form action={updateLinkItem.bind(null, item.id)} className="flex flex-1 flex-col gap-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[3rem_1fr_1.3fr_1fr]">
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
                placeholder="Sub-line (optional)"
                aria-label="Description"
                className={fieldInputClasses}
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-3 lg:grid-cols-[1.4fr_7rem_6rem_8rem_auto_6.5rem_auto]">
              <UploadInput
                name="image_url"
                defaultValue={item.image_url ?? ""}
                ariaLabel="Tile image"
                placeholder="Paste an image address…"
              />
              <select
                name="size"
                defaultValue={item.size}
                aria-label="Tile size"
                className={fieldInputClasses}
              >
                {LINK_TILE_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
              <select
                name="tab"
                defaultValue={item.tab}
                aria-label="Tab"
                className={fieldInputClasses}
              >
                <option value="links">Links</option>
                <option value="shop">Shop</option>
              </select>
              <input
                name="section"
                defaultValue={item.section ?? ""}
                list={SECTION_LIST_ID}
                placeholder="Group heading"
                aria-label="Section"
                className={fieldInputClasses}
              />
              <label className="flex items-center gap-2 font-mono text-label uppercase tracking-[0.1em] text-ink-muted">
                <input
                  type="checkbox"
                  name="highlight"
                  defaultChecked={item.highlight}
                  className="h-4 w-4 accent-accent"
                />
                Ring
              </label>
              <select
                name="status"
                defaultValue={item.status}
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
            </div>
          </form>
          <DeleteButton action={deleteLinkItem.bind(null, item.id)} />
        </div>
      )}
    />
  );
}
