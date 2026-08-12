"use client";

import {
  updateGalleryItem,
  deleteGalleryItem,
  reorderGalleryItems,
} from "@/lib/admin/gallery-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import UploadInput from "@/components/admin/UploadInput";
import { mediaThumbnail } from "@/lib/media";
import type { GalleryItemRow } from "@/lib/supabase/types";

export default function GalleryItemsList({ items }: { items: GalleryItemRow[] }) {
  return (
    <ReorderableList
      items={items}
      onReorder={reorderGalleryItems}
      renderRow={(item) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaThumbnail(item.image_url)}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md border border-line object-cover"
          />

          <form action={updateGalleryItem.bind(null, item.id)} className="flex flex-1 flex-col gap-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1fr]">
              <UploadInput
                name="image_url"
                defaultValue={item.image_url}
                ariaLabel="Image"
                placeholder="Paste an image address…"
              />
              <input
                name="title"
                defaultValue={item.title ?? ""}
                placeholder="Title (optional)"
                aria-label="Title"
                className={fieldInputClasses}
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-3 lg:grid-cols-[1.4fr_1fr_6.5rem_auto]">
              <input
                name="caption"
                defaultValue={item.caption ?? ""}
                placeholder="Caption (optional)"
                aria-label="Caption"
                className={fieldInputClasses}
              />
              <input
                name="link_url"
                defaultValue={item.link_url ?? ""}
                placeholder="Links to… (optional)"
                aria-label="Link"
                className={fieldInputClasses}
              />
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
          <DeleteButton action={deleteGalleryItem.bind(null, item.id)} />
        </div>
      )}
    />
  );
}
