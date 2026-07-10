"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fieldInputClasses } from "@/components/admin/Field";

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
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const uploaded: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, alt: "" });
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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
              <img src={image.url} alt="" className="aspect-square w-full border border-line object-cover" />
              <span className="absolute left-1 top-1 bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                {i + 1}
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

      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
        className={fieldInputClasses}
      />
      <input type="hidden" name={name} value={JSON.stringify(images)} />
      {uploading && <span className="font-mono text-label text-ink-muted">Uploading…</span>}
      {error && <span className="font-mono text-label text-error">{error}</span>}
    </div>
  );
}
