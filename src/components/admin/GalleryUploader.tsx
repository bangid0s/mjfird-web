"use client";

import { useState } from "react";
import { uploadToMedia } from "@/lib/upload";
import { fieldInputClasses } from "@/components/admin/Field";
import { isYouTubeUrl, mediaThumbnail } from "@/lib/media";
import { cn } from "@/lib/cn";

type GalleryImage = { url: string; alt?: string };

export default function GalleryUploader({
  name,
  label,
  initial,
}: {
  name: string;
  label: string;
  initial?: GalleryImage[];
}) {
  const [images, setImages] = useState<GalleryImage[]>(initial ?? []);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        uploaded.push({ url: await uploadToMedia(file), alt: "" });
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addByUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, { url: trimmed, alt: "" }]);
    setUrlDraft("");
  };

  const move = (index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">{label}</span>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image, i) => (
            <div key={`${image.url}-${i}`} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaThumbnail(image.url)}
                alt=""
                className="aspect-square w-full border border-line object-cover"
              />
              <span className="absolute left-1 top-1 bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                {i + 1}
                {isYouTubeUrl(image.url) && <span className="ml-1 uppercase text-accent">▶ YT</span>}
              </span>
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move earlier"
                  className="bg-bg/90 px-2 py-1 font-mono text-label text-ink disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove image"
                  className="bg-bg/90 px-2 py-1 font-mono text-label text-error"
                >
                  ×
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label="Move later"
                  className="bg-bg/90 px-2 py-1 font-mono text-label text-ink disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 border border-dashed px-4 py-6 text-center transition-colors duration-[var(--duration-fast)]",
          dragging ? "border-accent bg-bg-raised" : "border-line hover:border-ink-faint",
        )}
      >
        <span className="font-mono text-label text-ink-faint">
          {uploading ? "Uploading…" : "Drag & drop images here — or click to browse (multiple allowed)"}
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
          placeholder="…or paste an image address / YouTube link"
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

      <input type="hidden" name={name} value={JSON.stringify(images)} />
      {error && <span className="font-mono text-label text-error">{error}</span>}
    </div>
  );
}
