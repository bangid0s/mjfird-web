"use client";

import { useState } from "react";
import { uploadToMedia } from "@/lib/upload";
import { fieldInputClasses } from "@/components/admin/Field";
import { isVideoFile, isYouTubeUrl, mediaThumbnail } from "@/lib/media";
import { cn } from "@/lib/cn";

export default function ImageUploader({
  name,
  label,
  initialUrl,
  onUploaded,
  accept = "image/*",
}: {
  name: string;
  label: string;
  initialUrl?: string | null;
  onUploaded?: (url: string) => void;
  accept?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadToMedia(file);
      setUrl(publicUrl);
      onUploaded?.(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">{label}</span>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 border border-dashed px-4 py-6 text-center transition-colors duration-[var(--duration-fast)]",
          dragging ? "border-accent bg-bg-raised" : "border-line hover:border-ink-faint",
        )}
      >
        {url &&
          (isVideoFile(url) ? (
            <video src={url} muted loop playsInline controls className="h-32 w-full max-w-xs object-cover" />
          ) : (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaThumbnail(url)} alt="" className="h-32 w-full max-w-xs object-contain" />
              {isYouTubeUrl(url) && (
                <span className="absolute left-1 top-1 bg-bg/85 px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent">
                  YouTube
                </span>
              )}
            </span>
          ))}
        <span className="font-mono text-label text-ink-faint">
          {uploading ? "Uploading…" : url ? "Drop a file to replace — or click to browse" : "Drag & drop here — or click to browse"}
        </span>
        <input
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </label>

      <input
        name={name}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          onUploaded?.(e.target.value);
        }}
        placeholder="…or paste an image address / YouTube link"
        disabled={uploading}
        className={fieldInputClasses}
      />
      {url && (
        <button
          type="button"
          onClick={() => {
            setUrl("");
            onUploaded?.("");
          }}
          className="self-start font-mono text-label uppercase tracking-[0.1em] text-ink-faint hover:text-error"
        >
          Remove
        </button>
      )}
      {error && <span className="font-mono text-label text-error">{error}</span>}
    </div>
  );
}
