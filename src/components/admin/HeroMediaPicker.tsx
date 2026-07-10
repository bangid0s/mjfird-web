"use client";

import { useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";

type MediaType = "none" | "image" | "video" | "youtube";

export default function HeroMediaPicker({
  initialType,
  initialUrl,
}: {
  initialType?: MediaType;
  initialUrl?: string | null;
}) {
  const [type, setType] = useState<MediaType>(initialType ?? "none");

  return (
    <div className="flex flex-col gap-6">
      <Field label="Hero background">
        <select
          name="hero_media_type"
          value={type}
          onChange={(e) => setType(e.target.value as MediaType)}
          className={fieldInputClasses}
        >
          <option value="none">None — solid dark background</option>
          <option value="image">Uploaded image</option>
          <option value="video">Uploaded video (autoplays muted, loops)</option>
          <option value="youtube">YouTube video (autoplays muted, loops)</option>
        </select>
      </Field>

      {(type === "image" || type === "video") && (
        <ImageUploader
          name="hero_media_url"
          label={type === "image" ? "Hero image" : "Hero video (.mp4 / .webm)"}
          initialUrl={initialUrl}
          accept={type === "image" ? "image/*" : "video/mp4,video/webm"}
        />
      )}

      {type === "youtube" && (
        <Field label="YouTube link — any format (watch, share, or Shorts URL)">
          <input
            name="hero_media_url"
            type="url"
            defaultValue={initialUrl ?? ""}
            placeholder="https://www.youtube.com/watch?v=…"
            className={fieldInputClasses}
          />
        </Field>
      )}

      {type === "none" && <input type="hidden" name="hero_media_url" value={initialUrl ?? ""} />}
    </div>
  );
}
