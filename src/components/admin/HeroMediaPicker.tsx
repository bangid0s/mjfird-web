"use client";

import { useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import HeroSlidesEditor from "@/components/admin/HeroSlidesEditor";

type MediaType = "none" | "image" | "video" | "youtube";

type HeroSlideInput = {
  url: string;
  alt?: string;
  eyebrow?: string;
  intro?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export default function HeroMediaPicker({
  initialType,
  initialUrl,
  initialImages,
  initialOverlay,
  initialAnimation,
  initialSlideDuration,
}: {
  initialType?: MediaType;
  initialUrl?: string | null;
  initialImages?: HeroSlideInput[];
  initialOverlay?: number;
  initialAnimation?: "none" | "zoom" | "drift" | "pulse";
  initialSlideDuration?: number;
}) {
  const [type, setType] = useState<MediaType>(initialType ?? "none");
  /*
    Kept as a hidden round-trip rather than a control. The hero used to run the
    image behind the copy and needed a tint to keep the text readable; it now
    gives the media a frame of its own at every width, so nothing is painted
    over the artwork and there is no overlay left for a slider to set. The value
    still submits unchanged so the stored setting survives a save.
  */
  const overlay = initialOverlay ?? 60;
  const [slideDuration, setSlideDuration] = useState(initialSlideDuration ?? 5);

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
          <option value="image">Image(s) — 2+ become a slideshow</option>
          <option value="video">Uploaded video (autoplays muted, loops)</option>
          <option value="youtube">YouTube video (autoplays muted, loops)</option>
        </select>
      </Field>

      {type === "image" && (
        <>
          <HeroSlidesEditor name="hero_media_urls" initial={initialImages} />
          <Field label="Image animation">
            <select
              name="hero_animation"
              defaultValue={initialAnimation ?? "none"}
              className={fieldInputClasses}
            >
              <option value="none">None — still image</option>
              <option value="zoom">Slow zoom — cinematic Ken Burns push-in</option>
              <option value="drift">Drift — slow side-to-side pan</option>
              <option value="pulse">Pulse — gentle breathing scale</option>
            </select>
          </Field>
          <Field label={`Auto-slide duration — ${slideDuration}s per image (only applies with 2+ images)`}>
            <input
              type="range"
              name="hero_slide_duration"
              min={2}
              max={15}
              step={1}
              value={slideDuration}
              onChange={(e) => setSlideDuration(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </Field>
          {/* keep the single-media slot for video/youtube so switching types doesn't lose it */}
          <input type="hidden" name="hero_media_url" value={initialUrl ?? ""} />
        </>
      )}

      {type !== "image" && (
        <>
          <input type="hidden" name="hero_animation" value={initialAnimation ?? "none"} />
          <input type="hidden" name="hero_slide_duration" value={slideDuration} />
        </>
      )}

      {type === "video" && (
        <>
          <ImageUploader
            name="hero_media_url"
            label="Hero video (.mp4 / .webm)"
            initialUrl={initialUrl}
            accept="video/mp4,video/webm"
          />
          <input type="hidden" name="hero_media_urls" value={JSON.stringify(initialImages ?? [])} />
        </>
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

      {type === "youtube" && (
        <input type="hidden" name="hero_media_urls" value={JSON.stringify(initialImages ?? [])} />
      )}

      {type === "none" && (
        <>
          <input type="hidden" name="hero_media_url" value={initialUrl ?? ""} />
          <input type="hidden" name="hero_media_urls" value={JSON.stringify(initialImages ?? [])} />
        </>
      )}

      <input type="hidden" name="hero_overlay_opacity" value={overlay} />
    </div>
  );
}
