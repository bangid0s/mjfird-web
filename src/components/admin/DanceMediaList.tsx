"use client";

import { updateMedia, deleteMedia, reorderMedia } from "@/lib/admin/dance-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import UploadInput from "@/components/admin/UploadInput";
import type { DanceMediaRow } from "@/lib/supabase/types";

export default function DanceMediaList({ media }: { media: DanceMediaRow[] }) {
  return (
    <ReorderableList
      items={media}
      onReorder={reorderMedia}
      renderRow={(item) => (
        <div className="flex items-center gap-3">
          <form
            action={updateMedia.bind(null, item.id)}
            className="grid flex-1 grid-cols-[100px_1fr_1fr_100px_auto] items-center gap-3"
          >
            <select name="kind" defaultValue={item.kind} className={fieldInputClasses}>
              <option value="photo">Photo</option>
              <option value="video">Video</option>
            </select>
            <UploadInput name="url" defaultValue={item.url} ariaLabel="URL" placeholder="URL or drop a file" />
            <input name="caption" defaultValue={item.caption ?? ""} className={fieldInputClasses} />
            <select name="status" defaultValue={item.status} className={fieldInputClasses}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <button
              type="submit"
              className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
            >
              Save
            </button>
          </form>
          <DeleteButton action={deleteMedia.bind(null, item.id)} />
        </div>
      )}
    />
  );
}
