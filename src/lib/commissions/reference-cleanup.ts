import type { CommissionStatus } from "@/lib/supabase/types";

/*
  Which client reference files can go, to keep the `commissions` bucket small.

  - "closed": every request that lists the file is completed, declined or
    cancelled, and closed at least GRACE_DAYS ago. Clients often come back for a
    small revision soon after, so the references stay that long.
  - "orphan": no request lists it and it's older than ORPHAN_HOURS. These come
    from forms that were abandoned or re-submitted (the files upload before the
    request is sent).

  Never removed: anything an open request lists, anything a delivery list
  points at, and anything outside <client>/refs/.
*/

export const GRACE_DAYS = 15;
export const ORPHAN_HOURS = 48;
export const CLOSED_STATUSES: CommissionStatus[] = ["completed", "declined", "cancelled"];

export type StoredReference = { name: string; size: number; created_at: string | null };
export type CleanupRequest = {
  id: string;
  status: CommissionStatus;
  closed_at: string | null;
  reference_paths: string[];
  delivery_paths: string[];
};

export type CleanupFile = { path: string; size: number; reason: "closed" | "orphan" };
export type CleanupPlan = {
  files: CleanupFile[];
  bytes: number;
  /** Requests whose reference list loses paths, and which ones. */
  requests: { id: string; remove: string[] }[];
};

const HOUR = 3600 * 1000;

export function isReferencePath(path: string) {
  const parts = path.split("/");
  return parts.length >= 3 && parts[0] !== "" && parts[1] === "refs" && !path.includes("..");
}

export function planReferenceCleanup(
  objects: StoredReference[],
  requests: CleanupRequest[],
  opts: { now?: number; graceDays?: number; orphanHours?: number } = {},
): CleanupPlan {
  const now = opts.now ?? Date.now();
  const closedBefore = now - (opts.graceDays ?? GRACE_DAYS) * 24 * HOUR;
  const orphanBefore = now - (opts.orphanHours ?? ORPHAN_HOURS) * HOUR;

  const listedBy = new Map<string, CleanupRequest[]>();
  const deliveries = new Set<string>();
  for (const r of requests) {
    for (const p of r.reference_paths) listedBy.set(p, [...(listedBy.get(p) ?? []), r]);
    for (const p of r.delivery_paths) deliveries.add(p);
  }

  const pastGrace = (r: CleanupRequest) => {
    if (!CLOSED_STATUSES.includes(r.status) || !r.closed_at) return false;
    const t = Date.parse(r.closed_at);
    return Number.isFinite(t) && t <= closedBefore;
  };

  const files: CleanupFile[] = [];
  for (const o of objects) {
    if (!isReferencePath(o.name) || deliveries.has(o.name)) continue;
    const owners = listedBy.get(o.name) ?? [];
    if (owners.length > 0) {
      if (owners.every(pastGrace)) files.push({ path: o.name, size: o.size, reason: "closed" });
      continue;
    }
    const uploaded = o.created_at ? Date.parse(o.created_at) : NaN;
    if (Number.isFinite(uploaded) && uploaded <= orphanBefore) files.push({ path: o.name, size: o.size, reason: "orphan" });
  }

  return { files, bytes: files.reduce((s, f) => s + f.size, 0), requests: requestEdits(requests, files.map((f) => f.path)) };
}

/** For each request, the paths among `removed` that it lists. */
export function requestEdits(requests: CleanupRequest[], removed: string[]) {
  const gone = new Set(removed);
  return requests.flatMap((r) => {
    const remove = r.reference_paths.filter((p) => gone.has(p));
    return remove.length ? [{ id: r.id, remove }] : [];
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** "3 references were removed on 4 Dec 2026 to save space." Null when nothing was removed. */
export function purgedReferencesNote(row: { references_purged_at?: string | null; references_purged_count?: number }) {
  if (!row.references_purged_at) return null;
  const n = row.references_purged_count ?? 0;
  const date = new Date(row.references_purged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const what = n > 0 ? `${n} reference file${n === 1 ? " was" : "s were"}` : "Reference files were";
  return `${what} removed on ${date} to save space. The brief and messages are kept.`;
}
