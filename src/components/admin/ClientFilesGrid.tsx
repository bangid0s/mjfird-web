import { renameClientFile, deleteClientFile } from "@/lib/admin/client-files-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import DeleteButton from "@/components/admin/DeleteButton";
import { cn } from "@/lib/cn";

export type ClientFile = {
  path: string;
  name: string;
  url: string | null;
  size: number;
  createdAt: string | null;
  kind: "reference" | "delivery" | "other";
};

const IMAGE = /\.(png|jpe?g|gif|webp|avif)$/i;
const KIND_LABEL: Record<ClientFile["kind"], string> = { reference: "Reference", delivery: "Delivery", other: "File" };

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientFilesGrid({ files }: { files: ClientFile[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {files.map((file) => (
        <li key={file.path} className="flex flex-col gap-3 border border-line p-3">
          <a
            href={file.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex aspect-video items-center justify-center overflow-hidden bg-bg-raised"
          >
            {file.url && IMAGE.test(file.name) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.url} alt="" loading="lazy" className="h-full w-full object-contain" />
            ) : (
              <span className="font-mono text-label uppercase text-ink-faint">{file.name.split(".").pop() || "file"}</span>
            )}
            <span
              className={cn(
                "absolute left-2 top-2 border px-1.5 py-0.5 font-mono text-[11px] uppercase",
                file.kind === "delivery" ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg text-ink-muted",
              )}
            >
              {KIND_LABEL[file.kind]}
            </span>
          </a>

          <form action={renameClientFile.bind(null, file.path)} className="flex items-center gap-2">
            <input
              name="name"
              defaultValue={file.name}
              aria-label={`File name for ${file.name}`}
              className={`${fieldInputClasses} min-w-0 flex-1 font-mono`}
            />
            <button type="submit" className="shrink-0 text-body-sm font-medium text-ink-muted hover:text-ink">
              Rename
            </button>
          </form>

          <span className="font-mono text-label text-ink-faint">
            {formatBytes(file.size)}
            {file.createdAt && ` · ${new Date(file.createdAt).toLocaleDateString()}`}
          </span>

          <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
            {file.url ? (
              <a
                href={file.url}
                download={file.name}
                className="text-body-sm font-medium text-ink-faint transition-colors hover:text-ink"
              >
                Download
              </a>
            ) : (
              <span />
            )}
            <DeleteButton action={deleteClientFile.bind(null, file.path)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
