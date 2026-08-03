"use client";

import { useState } from "react";
import { uploadToMedia } from "@/lib/upload";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import { mediaThumbnail, normalizeMediaUrl, urlFromDrop } from "@/lib/media";
import { cn } from "@/lib/cn";

type Slide = {
  url: string;
  alt?: string;
  eyebrow?: string;
  intro?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

const blankSlide = (url: string): Slide => ({
  url,
  alt: "",
  eyebrow: "",
  intro: "",
  ctaLabel: "",
  ctaUrl: "",
});

export default function HeroSlidesEditor({
  name,
  initial,
}: {
  name: string;
  initial?: Slide[];
}) {
  const [slides, setSlides] = useState<Slide[]>(initial ?? []);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded: Slide[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        uploaded.push(blankSlide(await uploadToMedia(file)));
      }
      setSlides((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addUrl = (url: string) => {
    const normalized = normalizeMediaUrl(url);
    if (!normalized) return;
    setSlides((prev) => [...prev, blankSlide(normalized)]);
  };

  const addByUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    addUrl(trimmed);
    setUrlDraft("");
  };

  const update = (index: number, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)));
  };

  const move = (index: number, direction: -1 | 1) => {
    setSlides((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">
        Hero slides — add 2 or more and they rotate as a slider
      </span>
      <p className="font-mono text-label text-ink-faint">
        Each slide can carry its own eyebrow, intro and button. Leave a field blank and that slide
        falls back to the hero copy above.
      </p>

      {slides.map((slide, i) => (
        <div key={`${slide.url}-${i}`} className="flex flex-col gap-5 border border-line p-4">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaThumbnail(slide.url)}
              alt=""
              className="h-20 w-32 shrink-0 border border-line bg-bg-raised object-cover"
            />
            <div className="flex flex-1 items-start justify-between gap-2">
              <span className="font-mono text-label uppercase tracking-[0.15em] text-accent">
                Slide {i + 1}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move slide earlier"
                  className="border border-line px-2 py-1 font-mono text-label text-ink-muted disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === slides.length - 1}
                  aria-label="Move slide later"
                  className="border border-line px-2 py-1 font-mono text-label text-ink-muted disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove slide"
                  className="border border-line px-2 py-1 font-mono text-label text-error"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <Field label="Eyebrow">
            <input
              value={slide.eyebrow ?? ""}
              onChange={(e) => update(i, { eyebrow: e.target.value })}
              placeholder="Same as the hero eyebrow"
              className={fieldInputClasses}
            />
          </Field>

          <Field label="Intro paragraph">
            <textarea
              rows={2}
              value={slide.intro ?? ""}
              onChange={(e) => update(i, { intro: e.target.value })}
              placeholder="Same as the hero intro"
              className={cn(fieldInputClasses, "resize-none")}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Button label">
              <input
                value={slide.ctaLabel ?? ""}
                onChange={(e) => update(i, { ctaLabel: e.target.value })}
                placeholder="Same as the primary button"
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Button link">
              <input
                value={slide.ctaUrl ?? ""}
                onChange={(e) => update(i, { ctaUrl: e.target.value })}
                placeholder="/work (the default)"
                className={fieldInputClasses}
              />
            </Field>
          </div>
        </div>
      ))}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) {
            handleFiles(e.dataTransfer.files);
            return;
          }
          const url = urlFromDrop(e.dataTransfer);
          if (url) addUrl(url);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 border border-dashed px-4 py-6 text-center transition-colors duration-[var(--duration-fast)]",
          dragging ? "border-accent bg-bg-raised" : "border-line hover:border-ink-faint",
        )}
      >
        <span className="font-mono text-label text-ink-faint">
          {uploading
            ? "Uploading…"
            : "Drag & drop images here to add slides — or click to browse (multiple allowed)"}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </label>

      <div className="flex items-end gap-2">
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addByUrl();
            }
          }}
          placeholder="…or paste an image address"
          className={fieldInputClasses}
        />
        <button
          type="button"
          onClick={addByUrl}
          disabled={!urlDraft.trim()}
          className="shrink-0 border border-line px-4 py-3 font-mono text-label uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <input type="hidden" name={name} value={JSON.stringify(slides)} />
      {error && <span className="font-mono text-label text-error">{error}</span>}
    </div>
  );
}
