import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishDeliveryToGallery } from "./delivery-gallery-run";

type Row = Record<string, unknown>;

/** Just enough of supabase-js for the runner: a few query shapes and two buckets. */
function fakeSupabase(opts: { gallery?: Row[]; files?: Record<string, Buffer> } = {}) {
  const gallery: Row[] = [...(opts.gallery ?? [])];
  const uploads: Record<string, Buffer> = {};
  const query = (rows: () => Row[]) => {
    let filtered = rows();
    const q = {
      select: () => q,
      eq: (col: string, val: unknown) => ((filtered = filtered.filter((r) => r[col] === val)), q),
      not: (col: string) => ((filtered = filtered.filter((r) => r[col] != null)), q),
      order: (col: string) => ((filtered = [...filtered].sort((a, b) => Number(a[col]) - Number(b[col]))), q),
      limit: (n: number) => ((filtered = filtered.slice(0, n)), q),
      maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
      then: (resolve: (v: { data: Row[]; error: null }) => void) => resolve({ data: filtered, error: null }),
    };
    return q;
  };
  const client = {
    from: (table: string) => {
      if (table === "services") return query(() => [{ id: "svc", category: "Illustration" }]);
      return {
        ...query(() => gallery),
        insert: async (row: Row) => {
          if (gallery.some((g) => g.request_id && g.request_id === row.request_id)) {
            return { error: { message: "duplicate key value violates unique constraint gallery_items_request_key" } };
          }
          gallery.push(row);
          return { error: null };
        },
      };
    },
    storage: {
      from: (bucket: string) => ({
        download: async (path: string) => {
          const file = opts.files?.[path];
          return file ? { data: new Blob([new Uint8Array(file)]), error: null } : { data: null, error: { message: "not found" } };
        },
        upload: async (path: string, body: Buffer) => ((uploads[`${bucket}/${path}`] = body), { error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
      }),
    },
  };
  return { client: client as unknown as SupabaseClient, gallery, uploads };
}

const PATH = "client1/deliveries/req1/1-a-final.png";
const req = {
  id: "req1", ref: 7, status: "delivered" as const, sharing: "final_only",
  delivery_paths: ["client1/deliveries/req1/0-z-source.psd", PATH],
  service_id: "svc", service_title: "Custom Illustration", package_name: "Full Body",
  extra_characters: 0, background_name: null, delivered_at: "2026-11-21T00:00:00Z",
};

async function png() {
  return sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#e07a1f" } }).png().toBuffer();
}

test("a shareable delivery becomes a live, newest-first gallery item", async () => {
  const db = fakeSupabase({ gallery: [{ slug: "kori", sort_order: 0 }], files: { [PATH]: await png() } });
  const result = await publishDeliveryToGallery(db.client, req);
  assert.deepEqual(result, { status: "added", slug: "full-body-custom-illustration" });

  const added = db.gallery.at(-1)!;
  assert.equal(added.status, "published");
  assert.equal(added.request_id, "req1");
  assert.equal(added.client_name, null, "no client name until they publish a review");
  assert.deepEqual(added.service_ids, ["svc"]);
  assert.deepEqual(added.tags, ["Illustration"]);
  assert.equal(added.sort_order, -1);
  assert.equal(added.image_url, "https://cdn.test/media/art/custom-illustration-full-body-commission-7.webp");

  const meta = await sharp(db.uploads["media/art/custom-illustration-full-body-commission-7.webp"]).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 2400, "resized to the 2400px long edge");
});

test("NDA, unanswered sharing, no image, or a second run add nothing", async () => {
  const files = { [PATH]: await png() };
  assert.deepEqual(await publishDeliveryToGallery(fakeSupabase({ files }).client, { ...req, sharing: "nda" }), {
    status: "skipped", reason: "not_shareable",
  });
  assert.deepEqual(await publishDeliveryToGallery(fakeSupabase({ files }).client, { ...req, sharing: null }), {
    status: "skipped", reason: "not_shareable",
  });
  assert.deepEqual(
    await publishDeliveryToGallery(fakeSupabase({ files }).client, { ...req, delivery_paths: ["c/deliveries/r/1-a-x.zip"] }),
    { status: "skipped", reason: "no_image" },
  );
  assert.deepEqual(await publishDeliveryToGallery(fakeSupabase({ files }).client, { ...req, status: "in_progress" }), {
    status: "skipped", reason: "not_delivered",
  });
  const db = fakeSupabase({ files });
  await publishDeliveryToGallery(db.client, req);
  assert.deepEqual(await publishDeliveryToGallery(db.client, req), { status: "skipped", reason: "already_added" });
  assert.equal(db.gallery.length, 1);
});

test("a missing file is reported, not thrown", async () => {
  const result = await publishDeliveryToGallery(fakeSupabase().client, req);
  assert.equal(result.status, "failed");
});
