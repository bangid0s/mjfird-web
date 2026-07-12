"use client";

import { useState } from "react";
import { uploadToMedia } from "@/lib/upload";
import { fieldInputClasses } from "@/components/admin/Field";
import { cn } from "@/lib/cn";

// URL text input that also accepts a dropped/browsed file: the file uploads to
// storage and its public URL fills the input. Pasting a URL (e.g. YouTube)
// still works as a plain text field.
export default function UploadInput({
  name,
  defaultValue,
  placeholder,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      setValue(await uploadToMedia(file));
    } catch {
      // keep whatever was typed; the row's Save will simply not change the URL
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="relative flex items-center gap-1"
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
    >
      <input
        name={name}
        value={uploading ? "Uploading…" : value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={uploading}
        className={cn(fieldInputClasses, dragging && "border-accent bg-bg-raised")}
      />
      <label
        title="Upload a file"
        className="cursor-pointer px-1 py-3 font-mono text-label text-ink-faint hover:text-accent"
      >
        ↑
        <input
          type="file"
          accept="image/*,video/mp4,video/webm"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </label>
    </div>
  );
}
