"use client";

import { useState } from "react";
import { renameMediaFile, deleteMediaFile } from "@/lib/admin/media-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import DeleteButton from "@/components/admin/DeleteButton";
import { isVideoFile } from "@/lib/media";
import { cn } from "@/lib/cn";

export type MediaFile = {
  name: string;
  url: string;
  size: number;
  createdAt: string | null;
  uses: number;
};

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(name: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(name);
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink"
    >
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}

export default function MediaGrid({ files }: { files: MediaFile[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {files.map((file) => (
        <li key={file.name} className="flex flex-col gap-3 border border-line p-3">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex aspect-video items-center justify-center overflow-hidden bg-bg-raised"
          >
            {isImage(file.name) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-faint">
                {isVideoFile(file.name) ? "Video" : "File"}
              </span>
            )}
          </a>

          <form action={renameMediaFile.bind(null, file.name)} className="flex items-center gap-2">
            <input
              name="name"
              defaultValue={file.name}
              aria-label={`File name for ${file.name}`}
              className={`${fieldInputClasses} min-w-0 flex-1 font-mono`}
            />
            <button
              type="submit"
              className="shrink-0 font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
            >
              Rename
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="font-mono text-label text-ink-faint">
              {formatBytes(file.size)}
              {file.createdAt && ` · ${new Date(file.createdAt).toLocaleDateString()}`}
            </span>
            <span
              className={cn(
                "font-mono text-label uppercase tracking-[0.1em]",
                file.uses > 0 ? "text-success" : "text-ink-faint",
              )}
            >
              {file.uses > 0 ? `Used ${file.uses}×` : "Unused"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
            <CopyUrlButton url={file.url} />
            <DeleteButton action={deleteMediaFile.bind(null, file.name)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
