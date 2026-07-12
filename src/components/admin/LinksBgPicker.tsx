"use client";

import { useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";

type BgType = "none" | "image" | "video" | "youtube";

export default function LinksBgPicker({
  initialType,
  initialUrl,
  initialOverlay,
}: {
  initialType?: BgType;
  initialUrl?: string | null;
  initialOverlay?: number;
}) {
  const [type, setType] = useState<BgType>(initialType ?? "none");
  const [overlay, setOverlay] = useState(initialOverlay ?? 70);

  return (
    <div className="flex flex-col gap-6">
      <Field label="Page background">
        <select
          name="links_bg_type"
          value={type}
          onChange={(e) => setType(e.target.value as BgType)}
          className={fieldInputClasses}
        >
          <option value="none">None — solid theme background</option>
          <option value="image">Image</option>
          <option value="video">Uploaded video (autoplays muted, loops)</option>
          <option value="youtube">YouTube video (autoplays muted, loops)</option>
        </select>
      </Field>

      {(type === "image" || type === "video") && (
        <ImageUploader
          name="links_bg_url"
          label={type === "image" ? "Background image" : "Background video (.mp4 / .webm)"}
          initialUrl={initialUrl}
          accept={type === "image" ? "image/*" : "video/mp4,video/webm"}
        />
      )}

      {type === "youtube" && (
        <Field label="YouTube link — any format (watch, share, or Shorts URL)">
          <input
            name="links_bg_url"
            type="url"
            defaultValue={initialUrl ?? ""}
            placeholder="https://www.youtube.com/watch?v=…"
            className={fieldInputClasses}
          />
        </Field>
      )}

      {type === "none" && <input type="hidden" name="links_bg_url" value={initialUrl ?? ""} />}

      {type !== "none" ? (
        <Field label={`Dark overlay on the background — ${overlay}% (higher = darker, more readable buttons)`}>
          <input
            type="range"
            name="links_overlay_opacity"
            min={0}
            max={100}
            step={5}
            value={overlay}
            onChange={(e) => setOverlay(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </Field>
      ) : (
        <input type="hidden" name="links_overlay_opacity" value={overlay} />
      )}
    </div>
  );
}
