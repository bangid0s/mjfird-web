import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  isReferencePath,
  planReferenceCleanup,
  purgedReferencesNote,
  requestEdits,
  type CleanupRequest,
  type StoredReference,
} from "./commissions/reference-cleanup";
import { fitWithin, isResizable, keepShrunk, outputType, renameForType } from "./client/shrink-image";

const NOW = Date.parse("2026-12-01T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 24 * 3600 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();

const obj = (name: string, size = 100, created_at = daysAgo(60)): StoredReference => ({ name, size, created_at });
const req = (id: string, status: CleanupRequest["status"], closed_at: string | null, refs: string[], deliveries: string[] = []): CleanupRequest => ({
  id,
  status,
  closed_at,
  reference_paths: refs,
  delivery_paths: deliveries,
});

test("references go 15 days after the order closes, not before", () => {
  const objects = [obj("u1/refs/a.png", 1000), obj("u1/refs/b.png", 2000), obj("u2/refs/c.jpg", 500), obj("u3/refs/d.jpg", 50)];
  const requests = [
    req("done-old", "completed", daysAgo(16), ["u1/refs/a.png"]),
    req("done-new", "completed", daysAgo(14), ["u1/refs/b.png"]),
    req("declined", "declined", daysAgo(20), ["u2/refs/c.jpg"]),
    req("cancelled", "cancelled", daysAgo(15.01), ["u3/refs/d.jpg"]),
  ];
  const plan = planReferenceCleanup(objects, requests, { now: NOW });
  assert.deepEqual(plan.files.map((f) => f.path).sort(), ["u1/refs/a.png", "u2/refs/c.jpg", "u3/refs/d.jpg"]);
  assert.ok(plan.files.every((f) => f.reason === "closed"));
  assert.equal(plan.bytes, 1550);
});

test("open orders keep their references, whatever their age", () => {
  const objects = ["pending", "awaiting_payment", "in_progress", "delivered"].map((s) => obj(`u/refs/${s}.png`));
  const requests = (["pending", "awaiting_payment", "in_progress", "delivered"] as const).map((s) =>
    req(s, s, daysAgo(90), [`u/refs/${s}.png`]),
  );
  assert.equal(planReferenceCleanup(objects, requests, { now: NOW }).files.length, 0);
});

test("a file shared with an open or recent order is kept", () => {
  const objects = [obj("u/refs/shared.png"), obj("u/refs/shared2.png")];
  const requests = [
    req("old", "completed", daysAgo(40), ["u/refs/shared.png", "u/refs/shared2.png"]),
    req("open", "in_progress", null, ["u/refs/shared.png"]),
    req("recent", "completed", daysAgo(3), ["u/refs/shared2.png"]),
  ];
  assert.deepEqual(planReferenceCleanup(objects, requests, { now: NOW }).files, []);
});

test("closed orders without a closing time are kept (fail safe)", () => {
  const plan = planReferenceCleanup([obj("u/refs/a.png")], [req("x", "completed", null, ["u/refs/a.png"])], { now: NOW });
  assert.equal(plan.files.length, 0);
});

test("orphan uploads go after 48 hours", () => {
  const objects = [obj("u/refs/old.png", 10, hoursAgo(49)), obj("u/refs/fresh.png", 10, hoursAgo(47)), obj("u/refs/unknown.png", 10, null as unknown as string)];
  const plan = planReferenceCleanup(objects, [], { now: NOW });
  assert.deepEqual(plan.files, [{ path: "u/refs/old.png", size: 10, reason: "orphan" }]);
});

test("deliveries and anything outside refs/ are never touched", () => {
  const objects = [obj("u/deliveries/r1/final.png"), obj("u/refs/also-delivered.png"), obj("loose.png"), obj("u/refs/../x.png")];
  const requests = [req("r1", "completed", daysAgo(90), ["u/refs/also-delivered.png"], ["u/refs/also-delivered.png", "u/deliveries/r1/final.png"])];
  assert.deepEqual(planReferenceCleanup(objects, requests, { now: NOW }).files, []);
  assert.equal(isReferencePath("u/refs/a.png"), true);
  assert.equal(isReferencePath("u/deliveries/r/a.png"), false);
  assert.equal(isReferencePath("/refs/a.png"), false);
});

test("each request loses exactly the removed paths", () => {
  const requests = [req("a", "completed", daysAgo(30), ["p1", "p2"]), req("b", "completed", daysAgo(30), ["p2", "p3"]), req("c", "pending", null, ["p4"])];
  assert.deepEqual(requestEdits(requests, ["p2", "p3"]), [
    { id: "a", remove: ["p2"] },
    { id: "b", remove: ["p2", "p3"] },
  ]);
});

test("the request page note", () => {
  assert.equal(purgedReferencesNote({}), null);
  assert.equal(
    purgedReferencesNote({ references_purged_at: "2026-12-04T10:00:00Z", references_purged_count: 3 }),
    "3 reference files were removed on 4 Dec 2026 to save space. The brief and messages are kept.",
  );
  assert.match(purgedReferencesNote({ references_purged_at: "2026-12-04T10:00:00Z", references_purged_count: 1 })!, /^1 reference file was/);
});

test("resize on upload: sizes, formats and names", () => {
  assert.deepEqual(fitWithin(6000, 4000), { width: 2560, height: 1707, scaled: true });
  assert.deepEqual(fitWithin(3000, 9000), { width: 853, height: 2560, scaled: true });
  assert.deepEqual(fitWithin(1200, 800), { width: 1200, height: 800, scaled: false }, "never upscales");
  assert.equal(isResizable("image/jpeg"), true);
  assert.equal(isResizable("image/gif"), false, "GIFs may be animated");
  assert.equal(isResizable("application/pdf"), false);
  assert.equal(outputType("image/jpeg"), "image/jpeg");
  assert.equal(outputType("image/png"), "image/webp", "keeps transparency");
  assert.equal(renameForType("My Ref.PNG", "image/webp"), "My Ref.webp");
  assert.equal(renameForType("photo.jpeg", "image/jpeg"), "photo.jpg");
  assert.equal(renameForType("noext", "image/webp"), "noext.webp");
  assert.equal(keepShrunk(5_000_000, 600_000), true);
  assert.equal(keepShrunk(200_000, 250_000), false, "never swaps in a bigger file");
});

test("migration 0051: closed_at stamping and who can list reference files", async () => {
  const ADMIN = "55555555-5555-4555-8555-555555555555";
  const CLIENT = "22222222-2222-4222-8222-222222222222";
  const pg = new PGlite();
  await pg.exec(`
    create role authenticated; create role anon; create role service_role;
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create or replace function auth.role() returns text language sql stable as $$
      select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    create table admins (user_id uuid primary key);
    create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
      select exists (select 1 from public.admins where user_id = auth.uid()) $$;
    create schema storage;
    create table storage.objects (bucket_id text, name text, metadata jsonb, created_at timestamptz default now());
    create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    create type commission_status as enum ('pending','awaiting_payment','in_progress','delivered','completed','declined','cancelled');
    create table commission_requests (
      id serial primary key, status commission_status not null default 'pending',
      created_at timestamptz default now(), updated_at timestamptz default now(), completed_at timestamptz,
      reference_paths text[] not null default '{}'
    );
    insert into admins values ('${ADMIN}');
    insert into commission_requests (status, completed_at, updated_at) values
      ('completed', '2026-10-01', '2026-10-05'), ('declined', null, '2026-09-01'), ('pending', null, now());
    insert into storage.objects (bucket_id, name, metadata) values
      ('commissions', '${CLIENT}/refs/a.png', '{"size": 1234}'),
      ('commissions', '${CLIENT}/deliveries/1/final.png', '{"size": 99}'),
      ('media', 'site/hero.png', '{"size": 5}');
  `);
  const migration = readFileSync(new URL("../../supabase/migrations/0051_reference_cleanup.sql", import.meta.url), "utf8");
  await pg.exec(migration);
  await pg.exec(migration); // safe to re-apply

  const closed = async () => (await pg.query<{ id: number; closed_at: Date | null }>("select id, closed_at from commission_requests order by id")).rows;
  let rows = await closed();
  assert.equal(rows[0].closed_at?.toISOString().slice(0, 10), "2026-10-01", "completed → completed_at");
  assert.equal(rows[1].closed_at?.toISOString().slice(0, 10), "2026-09-01", "declined → updated_at");
  assert.equal(rows[2].closed_at, null);

  await pg.exec("update commission_requests set status = 'cancelled' where id = 3");
  rows = await closed();
  assert.ok(rows[2].closed_at && Date.now() - rows[2].closed_at.getTime() < 60_000, "stamped when it closes");
  await pg.exec("update commission_requests set reference_paths = '{x}' where id = 1");
  assert.equal((await closed())[0].closed_at?.toISOString().slice(0, 10), "2026-10-01", "other edits leave it alone");
  await pg.exec("update commission_requests set status = 'pending' where id = 1");
  assert.equal((await closed())[0].closed_at, null, "reopening clears it");

  await pg.exec("grant usage on schema public to authenticated, service_role, anon");
  async function listAs(role: string, uid: string, jwtRole: string) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '${uid}', false), set_config('request.jwt.claim.role', '${jwtRole}', false)`);
    await pg.exec(`set role ${role}`);
    try {
      return (await pg.query<{ name: string; size: string }>("select name, size from public.commission_reference_objects()")).rows;
    } finally {
      await pg.exec("reset role");
    }
  }
  assert.deepEqual(await listAs("authenticated", ADMIN, "authenticated"), [{ name: `${CLIENT}/refs/a.png`, size: 1234 }]);
  assert.equal((await listAs("service_role", "", "service_role")).length, 1);
  await assert.rejects(listAs("authenticated", CLIENT, "authenticated"), /not_allowed/);
  await assert.rejects(listAs("anon", "", "anon"), /permission denied/);
});
