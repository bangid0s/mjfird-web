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

  // Only clears the field — the post keeps its old image until the form is saved.
  const clear = () => {
    setUrl("");
    setError(null);
    onUploaded?.("");
  };

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
      <span className="text-body-sm font-medium text-ink-muted">{label}</span>

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
        {url && (
          <span className="relative">
            {isVideoFile(url) ? (
              <video src={url} muted loop playsInline controls className="h-32 w-full max-w-xs object-cover" />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaThumbnail(url)} alt="" className="h-32 w-full max-w-xs object-contain" />
                {isYouTubeUrl(url) && (
                  <span className="absolute left-1 top-1 bg-bg/85 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                    YouTube
                  </span>
                )}
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                // Inside the drop-zone label: stop the click opening the file picker.
                e.preventDefault();
                e.stopPropagation();
                clear();
              }}
              disabled={uploading}
              aria-label="Delete this image"
              title="Delete this image"
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg text-lg leading-none text-error shadow-sm transition-colors hover:border-error hover:bg-error hover:text-bg disabled:opacity-40"
            >
              ×
            </button>
          </span>
        )}
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
          onClick={clear}
          disabled={uploading}
          className="self-start border border-line px-3 py-1.5 text-body-sm font-medium text-error transition-colors hover:border-error disabled:opacity-40"
        >
          Delete image
        </button>
      )}
      {error && <span className="font-mono text-label text-error">{error}</span>}
    </div>
  );
}
