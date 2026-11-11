import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import MediaTabs from "@/components/admin/MediaTabs";
import ClientFilesGrid, { type ClientFile } from "@/components/admin/ClientFilesGrid";
import StatusChip from "@/components/commissions/StatusChip";
import { fieldInputClasses } from "@/components/admin/Field";
import { formatDate } from "@/lib/admin/format";
import { clientFileName, parseClientFilePath } from "@/lib/commissions/client-files";
import type { CommissionRequestRow } from "@/lib/supabase/types";

const BUCKET = "commissions";
const LIST_LIMIT = 1000;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type StoredObject = { path: string; size: number; createdAt: string | null };
type RequestLite = Pick<
  CommissionRequestRow,
  "id" | "ref" | "service_title" | "contact_name" | "contact_email" | "client_id" | "status" | "reference_paths" | "delivery_paths" | "created_at"
>;

/** One folder level: files (with an id) and sub-folders (id is null). */
async function listLevel(supabase: Supabase, prefix: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: LIST_LIMIT,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(error.message);
  const files: StoredObject[] = [];
  const folders: string[] = [];
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) files.push({ path, size: (entry.metadata?.size as number | undefined) ?? 0, createdAt: entry.created_at ?? null });
    else folders.push(path);
  }
  return { files, folders };
}

/**
 * Storage lists one level at a time, so walk the known layout:
 * <uid>/refs/*  and  <uid>/deliveries/<request id>/*
 */
async function listAllClientFiles(supabase: Supabase): Promise<StoredObject[]> {
  const root = await listLevel(supabase, "");
  const perClient = await Promise.all(
    root.folders.map(async (uid) => {
      const [refs, deliveries] = await Promise.all([listLevel(supabase, `${uid}/refs`), listLevel(supabase, `${uid}/deliveries`)]);
      const perRequest = await Promise.all(deliveries.folders.map((folder) => listLevel(supabase, folder)));
      return [...refs.files, ...perRequest.flatMap((level) => level.files)];
    }),
  );
  return perClient.flat();
}

function matches(request: RequestLite, q: string) {
  const hay = `${request.ref} ${request.service_title} ${request.contact_name} ${request.contact_email}`.toLowerCase();
  return hay.includes(q);
}

export default async function AdminClientFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; renamed?: string; deleted?: string; q?: string }>;
}) {
  const { error, renamed, deleted, q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase();
  const supabase = await createClient();

  let listError: string | null = null;
  let stored: StoredObject[] = [];
  try {
    stored = await listAllClientFiles(supabase);
  } catch (err) {
    listError = err instanceof Error ? err.message : "Couldn't list client files.";
  }

  const { data: requestRows } = await supabase
    .from("commission_requests")
    .select("id, ref, service_title, contact_name, contact_email, client_id, status, reference_paths, delivery_paths, created_at")
    .order("created_at", { ascending: false });
  const requests = (requestRows ?? []) as RequestLite[];

  const { data: signed } = stored.length
    ? await supabase.storage.from(BUCKET).createSignedUrls(stored.map((o) => o.path), 60 * 60)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl]));

  const toFile = (object: StoredObject): ClientFile => ({
    path: object.path,
    name: clientFileName(object.path),
    url: urlByPath.get(object.path) ?? null,
    size: object.size,
    createdAt: object.createdAt,
    kind: parseClientFilePath(object.path).kind,
  });

  // A file belongs to the request that lists it. References can in theory be
  // listed by more than one request; the newest one wins for grouping.
  const ownerByPath = new Map<string, RequestLite>();
  for (const request of requests) {
    for (const path of [...request.reference_paths, ...request.delivery_paths]) {
      if (!ownerByPath.has(path)) ownerByPath.set(path, request);
    }
  }

  const groups = new Map<string, { request: RequestLite; files: ClientFile[] }>();
  const loose: ClientFile[] = [];
  for (const object of stored) {
    const owner = ownerByPath.get(object.path);
    if (!owner) {
      loose.push(toFile(object));
      continue;
    }
    const group = groups.get(owner.id) ?? { request: owner, files: [] };
    group.files.push(toFile(object));
    groups.set(owner.id, group);
  }

  const orderedGroups = requests
    .map((request) => groups.get(request.id))
    .filter((group): group is { request: RequestLite; files: ClientFile[] } => Boolean(group))
    .filter((group) => !q || matches(group.request, q));
  const visibleLoose = q ? [] : loose;
  const totalBytes = stored.reduce((sum, o) => sum + o.size, 0);

  return (
    <div>
      <PageHeader
        title="Files"
        description="Private files from commission requests — references clients attached and the deliveries you uploaded. Only you and that client can open them; links expire after an hour."
      />
      <MediaTabs active="/admin/media/client" />

      {renamed && (
        <p className="mb-8 border border-success px-4 py-3 font-mono text-label text-success">
          Renamed to {renamed}. The request now points at the new name.
        </p>
      )}
      {deleted && (
        <p className="mb-8 border border-line px-4 py-3 font-mono text-label text-ink-muted">
          File deleted and removed from its request.
        </p>
      )}
      {(error || listError) && (
        <p className="mb-8 border border-error px-4 py-3 font-mono text-label text-error">{error ?? listError}</p>
      )}

      {stored.length === 0 ? (
        !listError && (
          <EmptyState
            title="No client files yet"
            description="References clients attach to a request, and deliveries you upload on a request page, show up here."
          />
        )
      ) : (
        <>
          <form method="get" className="mb-6 flex flex-wrap items-center gap-3">
            <input
              type="search"
              name="q"
              defaultValue={rawQ ?? ""}
              placeholder="Filter by client, email, service, or #ref"
              aria-label="Filter client files"
              className={`${fieldInputClasses} min-w-0 flex-1 sm:max-w-sm`}
            />
            <button type="submit" className="text-body-sm font-medium text-ink-muted hover:text-ink">
              Filter
            </button>
            {q && (
              <Link href="/admin/media/client" className="text-body-sm text-ink-faint hover:text-ink">
                Clear
              </Link>
            )}
          </form>

          <p className="mb-8 font-mono text-label text-ink-faint">
            {stored.length} file{stored.length === 1 ? "" : "s"} · {(totalBytes / (1024 * 1024)).toFixed(1)} MB
            {loose.length > 0 && ` · ${loose.length} not attached to a request`}
          </p>

          <div className="flex flex-col gap-12">
            {orderedGroups.map(({ request, files }) => (
              <section key={request.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link href={`/admin/requests/${request.id}`} className="truncate text-body font-semibold text-ink hover:text-accent">
                      #{request.ref} · {request.service_title}
                    </Link>
                    <span className="truncate text-body-sm text-ink-muted">
                      {request.contact_name} · {request.contact_email} · {formatDate(request.created_at)}
                    </span>
                  </div>
                  <StatusChip status={request.status} />
                </div>
                <ClientFilesGrid files={files} />
              </section>
            ))}

            {visibleLoose.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5 border-b border-line pb-3">
                  <h2 className="text-body font-semibold text-ink">Not attached to a request</h2>
                  <span className="text-body-sm text-ink-muted">
                    Uploaded on a request form that was never sent, or left behind by a removed request. Usually safe to delete.
                  </span>
                </div>
                <ClientFilesGrid files={visibleLoose} />
              </section>
            )}

            {orderedGroups.length === 0 && visibleLoose.length === 0 && (
              <p className="py-10 text-body-sm text-ink-muted">No files match “{rawQ}”.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
