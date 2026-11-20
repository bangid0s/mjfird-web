import type { SupabaseClient } from "@supabase/supabase-js";
import {
  planReferenceCleanup,
  requestEdits,
  type CleanupPlan,
  type CleanupRequest,
  type StoredReference,
} from "@/lib/commissions/reference-cleanup";

/*
  Runs the plan from reference-cleanup.ts against Supabase. Works with either
  the admin's own session (the "Clean up now" button) or the service-role
  client (the daily cron). Files are removed first, then each request's
  reference list is trimmed to match and stamped, so the request page can say
  the references were removed rather than show a broken list.
*/

const BUCKET = "commissions";
const PAGE = 1000;
const REMOVE_BATCH = 100;

type RequestRow = CleanupRequest & { references_purged_count: number };

async function loadRequests(db: SupabaseClient): Promise<RequestRow[]> {
  const rows: RequestRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("commission_requests")
      .select("id, status, closed_at, reference_paths, delivery_paths, references_purged_count")
      .order("created_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't load requests: ${error.message}`);
    rows.push(...((data ?? []) as RequestRow[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function loadObjects(db: SupabaseClient): Promise<StoredReference[]> {
  const { data, error } = await db.rpc("commission_reference_objects");
  if (error) throw new Error(`Couldn't list reference files: ${error.message}`);
  return ((data ?? []) as { name: string; size: number | string; created_at: string | null }[]).map((o) => ({
    name: o.name,
    size: Number(o.size) || 0,
    created_at: o.created_at,
  }));
}

export async function previewReferenceCleanup(db: SupabaseClient, now = Date.now()): Promise<CleanupPlan> {
  const [objects, requests] = await Promise.all([loadObjects(db), loadRequests(db)]);
  return planReferenceCleanup(objects, requests, { now });
}

export type CleanupResult = {
  removed: number;
  bytes: number;
  failed: number;
  requestsUpdated: number;
  errors: string[];
};

export async function runReferenceCleanup(db: SupabaseClient, now = Date.now()): Promise<CleanupResult> {
  const [objects, requests] = await Promise.all([loadObjects(db), loadRequests(db)]);
  const plan = planReferenceCleanup(objects, requests, { now });
  const result: CleanupResult = { removed: 0, bytes: 0, failed: 0, requestsUpdated: 0, errors: [] };
  if (plan.files.length === 0) return result;

  const sizeOf = new Map(plan.files.map((f) => [f.path, f.size]));
  const removed: string[] = [];
  for (let i = 0; i < plan.files.length; i += REMOVE_BATCH) {
    const batch = plan.files.slice(i, i + REMOVE_BATCH).map((f) => f.path);
    const { data, error } = await db.storage.from(BUCKET).remove(batch);
    if (error) {
      result.failed += batch.length;
      result.errors.push(error.message);
      continue;
    }
    // Storage answers with the objects it actually deleted.
    const done = new Set((data ?? []).map((o) => o.name));
    for (const path of batch) {
      if (done.has(path)) removed.push(path);
      else result.failed += 1;
    }
  }
  result.removed = removed.length;
  result.bytes = removed.reduce((s, p) => s + (sizeOf.get(p) ?? 0), 0);

  const stamp = new Date(now).toISOString();
  const byId = new Map(requests.map((r) => [r.id, r]));
  for (const edit of requestEdits(requests, removed)) {
    const row = byId.get(edit.id)!;
    const drop = new Set(edit.remove);
    const { error } = await db
      .from("commission_requests")
      .update({
        reference_paths: row.reference_paths.filter((p) => !drop.has(p)),
        references_purged_at: stamp,
        references_purged_count: (row.references_purged_count ?? 0) + edit.remove.length,
      })
      .eq("id", edit.id);
    if (error) result.errors.push(`Request ${edit.id}: ${error.message}`);
    else result.requestsUpdated += 1;
  }
  return result;
}
