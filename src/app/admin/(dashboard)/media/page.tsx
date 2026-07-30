import { createClient } from "@/lib/supabase/server";
import { countMediaReferences } from "@/lib/admin/media-refs";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import MediaGrid, { type MediaFile } from "@/components/admin/MediaGrid";

const BUCKET = "media";
const LIMIT = 200;

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; renamed?: string; refs?: string; deleted?: string }>;
}) {
  const { error, renamed, refs, deleted } = await searchParams;
  const supabase = await createClient();

  const { data: objects, error: listError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: LIMIT, sortBy: { column: "created_at", order: "desc" } });

  // Supabase lists folder prefixes as rows with a null id — those aren't files.
  const entries = (objects ?? []).filter((object) => object.id);
  const urlFor = (name: string) => supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  const uses = await countMediaReferences(supabase, entries.map((entry) => urlFor(entry.name)));

  const files: MediaFile[] = entries.map((entry) => {
    const url = urlFor(entry.name);
    return {
      name: entry.name,
      url,
      size: (entry.metadata?.size as number | undefined) ?? 0,
      createdAt: entry.created_at ?? null,
      uses: uses[url] ?? 0,
    };
  });

  const unused = files.filter((file) => file.uses === 0).length;

  return (
    <div>
      <PageHeader
        title="Files"
        description="Everything uploaded to the media library. Renaming a file also repoints every page that uses it, so links never break. Deleting is permanent — check the usage badge first."
      />

      {renamed && (
        <p className="mb-8 border border-success px-4 py-3 font-mono text-label text-success">
          Renamed to {renamed}
          {refs && refs !== "0" && ` — updated ${refs} reference${refs === "1" ? "" : "s"}`}.
        </p>
      )}
      {deleted && (
        <p className="mb-8 border border-line px-4 py-3 font-mono text-label text-ink-muted">
          File deleted.
        </p>
      )}
      {(error || listError) && (
        <p className="mb-8 border border-error px-4 py-3 font-mono text-label text-error">
          {error ?? listError?.message}
        </p>
      )}

      {files.length === 0 ? (
        <EmptyState
          title="No files yet"
          description="Anything you upload from a project, service, blog post, or the links page shows up here."
        />
      ) : (
        <>
          <p className="mb-6 font-mono text-label text-ink-faint">
            {files.length} file{files.length === 1 ? "" : "s"}
            {unused > 0 && ` · ${unused} unused`}
            {files.length === LIMIT && ` · showing the newest ${LIMIT}`}
          </p>
          <MediaGrid files={files} />
        </>
      )}
    </div>
  );
}
