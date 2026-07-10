"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fieldInputClasses } from "@/components/admin/Field";

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

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
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setUrl(data.publicUrl);
      onUploaded?.(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">{label}</span>
      {url &&
        (isVideoUrl(url) ? (
          <video src={url} muted loop playsInline controls className="h-32 w-full max-w-xs object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-32 w-full max-w-xs object-cover" />
        ))}
      <input
        type="file"
        accept={accept}
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className={fieldInputClasses}
      />
      <input type="hidden" name={name} value={url} />
      {uploading && <span className="font-mono text-label text-ink-muted">Uploading…</span>}
      {error && <span className="font-mono text-label text-error">{error}</span>}
    </div>
  );
}
