import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../supabase/migrations/0047_work_stages.sql", import.meta.url), "utf8");

const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const SERVICE_ID = "66666666-6666-4666-8666-666666666666";
const EMPTY_SERVICE = "88888888-8888-4888-8888-888888888888";
const REQUEST = "11111111-1111-4111-8111-111111111111";
const LEGACY = "33333333-3333-4333-8333-333333333333";
const NO_STAGES = "77777777-7777-4777-8777-777777777777";

function rejects(code: string) {
  return (err: unknown) => err instanceof Error && err.message.includes(code);
}

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create table services (id uuid primary key, title text not null);
    create table commission_requests (
      id uuid primary key,
      ref serial,
      client_id uuid not null,
      service_id uuid references services (id) on delete set null,
      contact_name text not null default 'Ana',
      status commission_status not null default 'pending'
    );
    create table admins (user_id uuid primary key);
    create table notifications (user_id uuid, kind text, title text, body text, href text, request_id uuid);
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create or replace function public.is_admin()
    returns boolean language sql stable security definer set search_path = public as $$
      select exists (select 1 from public.admins where user_id = auth.uid());
    $$;
    create or replace function public.notification_snippet(p_text text) returns text language sql as $$ select left(p_text, 140) $$;
    create or replace function public.notify_user(p_user uuid, p_kind text, p_title text, p_body text, p_href text, p_request uuid)
    returns void language sql security definer set search_path = public as $$
      insert into notifications values (p_user, p_kind, p_title, p_body, p_href, p_request)
    $$;
    create or replace function public.notify_admins(p_kind text, p_title text, p_body text, p_href text, p_request uuid)
    returns void language sql security definer set search_path = public as $$
      insert into notifications select user_id, p_kind, p_title, p_body, p_href, p_request from admins
    $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter table commission_requests enable row level security;
    alter table commission_requests force row level security;
    create policy "client read own requests" on commission_requests
      for select using (client_id = auth.uid() or public.is_admin());
    create policy "admin all requests" on commission_requests
      for all using (public.is_admin()) with check (public.is_admin());
    grant select, insert, update, delete on commission_requests, services to anon, authenticated;
    insert into admins values ('${ADMIN_ID}');
    insert into services values ('${SERVICE_ID}', 'Character sheet'), ('${EMPTY_SERVICE}', 'Sticker');
    -- Already in progress before the migration: should be backfilled.
    insert into commission_requests (id, client_id, service_id, status) values ('${LEGACY}', '${CLIENT_ID}', '${SERVICE_ID}', 'in_progress');
  `);
  // Running it twice proves it is safe to re-apply.
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`
    grant select, insert, update, delete on commission_stage_events to anon, authenticated;
    update services set work_stages = '{}' where id = '${EMPTY_SERVICE}';
    insert into commission_requests (id, client_id, service_id, status) values
      ('${REQUEST}', '${CLIENT_ID}', '${SERVICE_ID}', 'awaiting_payment'),
      ('${NO_STAGES}', '${CLIENT_ID}', '${EMPTY_SERVICE}', 'awaiting_payment');
  `);

  async function as<T>(uid: string | null, fn: () => Promise<T>) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
    await pg.exec("set role authenticated");
    try {
      return await fn();
    } finally {
      await pg.exec("reset role");
    }
  }
  const request = async (id = REQUEST) =>
    (await pg.query<{ work_stages: string[]; stage_index: number; stage_status: string }>(
      "select work_stages, stage_index, stage_status from commission_requests where id = $1",
      [id],
    )).rows[0];
  const startWork = (id = REQUEST) => as(ADMIN_ID, () => pg.query("update commission_requests set status = 'in_progress' where id = $1", [id]));
  const preview = `${CLIENT_ID}/progress/${REQUEST}/1-ab-sketch.png`;
  return { pg, as, request, startWork, preview };
}

test("0047 is additive", () => {
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\bdrop\s+column\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
});

test("starting work copies the service's stages; orders already underway are backfilled", async () => {
  const { request, startWork } = await createDb();
  assert.deepEqual((await request(LEGACY))?.work_stages, ["Sketch", "Lineart", "Colour", "Final"]);
  assert.deepEqual((await request())?.work_stages, []);
  await startWork();
  assert.deepEqual(await request(), { work_stages: ["Sketch", "Lineart", "Colour", "Final"], stage_index: 0, stage_status: "working" });
  // A service with no stages opts out.
  await startWork(NO_STAGES);
  assert.deepEqual((await request(NO_STAGES))?.work_stages, []);
});

test("share, ask for changes, share again, approve, move on — with notifications both ways", async () => {
  const { pg, as, request, startWork, preview } = await createDb();
  await startWork();

  await as(ADMIN_ID, () => pg.query("select public.share_work_stage($1, $2, $3)", [REQUEST, "First pass", [preview]]));
  assert.equal((await request())?.stage_status, "review");

  await assert.rejects(() => as(CLIENT_ID, () => pg.query("select public.review_work_stage($1, false, '')", [REQUEST])), rejects("note_required"));
  await as(CLIENT_ID, () => pg.query("select public.review_work_stage($1, false, $2)", [REQUEST, "Cape darker please"]));
  assert.equal((await request())?.stage_status, "changes");
  await assert.rejects(() => as(CLIENT_ID, () => pg.query("select public.review_work_stage($1, true, '')", [REQUEST])), rejects("stage_not_in_review"));

  await as(ADMIN_ID, () => pg.query("select public.share_work_stage($1, $2, $3)", [REQUEST, "Darker cape", [preview]]));
  await as(CLIENT_ID, () => pg.query("select public.review_work_stage($1, true, '')", [REQUEST]));
  assert.equal((await request())?.stage_status, "approved");

  await as(ADMIN_ID, () => pg.query("select public.advance_work_stage($1)", [REQUEST]));
  assert.deepEqual(await request(), { work_stages: ["Sketch", "Lineart", "Colour", "Final"], stage_index: 1, stage_status: "working" });

  const events = await pg.query<{ kind: string; stage_name: string }>(
    "select kind, stage_name from commission_stage_events where request_id = $1 order by created_at, kind",
    [REQUEST],
  );
  assert.deepEqual(
    events.rows.map((e) => `${e.kind}:${e.stage_name}`),
    ["shared:Sketch", "changes:Sketch", "shared:Sketch", "approved:Sketch", "advanced:Lineart"],
  );
  const kinds = await pg.query<{ kind: string; user_id: string }>("select kind, user_id from notifications order by kind");
  assert.ok(kinds.rows.some((n) => n.kind === "stage_review" && n.user_id === CLIENT_ID));
  assert.ok(kinds.rows.some((n) => n.kind === "stage_changes" && n.user_id === ADMIN_ID));
  assert.ok(kinds.rows.some((n) => n.kind === "stage_approved" && n.user_id === ADMIN_ID));
  assert.ok(kinds.rows.some((n) => n.kind === "stage_started" && n.user_id === CLIENT_ID));
});

test("only the admin moves stages, only the owner reviews, previews stay in the request's folder", async () => {
  const { pg, as, startWork, preview } = await createDb();
  await startWork();
  await assert.rejects(() => as(CLIENT_ID, () => pg.query("select public.share_work_stage($1, 'x', '{}')", [REQUEST])), rejects("not_admin"));
  await assert.rejects(() => as(CLIENT_ID, () => pg.query("select public.advance_work_stage($1)", [REQUEST])), rejects("not_admin"));
  await assert.rejects(
    () => as(ADMIN_ID, () => pg.query("select public.share_work_stage($1, 'x', $2)", [REQUEST, [`${OTHER_ID}/refs/1-x-a.png`]])),
    rejects("invalid_file"),
  );
  await assert.rejects(
    () => as(ADMIN_ID, () => pg.query("select public.share_work_stage($1, 'x', $2)", [REQUEST, [`${CLIENT_ID}/progress/${REQUEST}/../x.png`]])),
    rejects("invalid_file"),
  );
  await as(ADMIN_ID, () => pg.query("select public.share_work_stage($1, 'x', $2)", [REQUEST, [preview]]));
  await assert.rejects(() => as(OTHER_ID, () => pg.query("select public.review_work_stage($1, true, '')", [REQUEST])), rejects("request_not_found"));
  // Nobody writes the history directly.
  await assert.rejects(() =>
    as(ADMIN_ID, () =>
      pg.query("insert into commission_stage_events (request_id, stage_index, stage_name, kind, from_admin) values ($1, 0, 'X', 'approved', false)", [REQUEST]),
    ),
  );
  const anon = await pg.query<{ allowed: boolean }>(
    "select has_function_privilege('anon', 'public.review_work_stage(uuid, boolean, text)', 'execute') as allowed",
  );
  assert.equal(anon.rows[0]?.allowed, false);
});

test("can't move past the last stage or work on stages before work starts", async () => {
  const { pg, as, startWork } = await createDb();
  await assert.rejects(() => as(ADMIN_ID, () => pg.query("select public.advance_work_stage($1)", [REQUEST])), rejects("stages_not_active"));
  await startWork();
  for (let i = 0; i < 3; i++) await as(ADMIN_ID, () => pg.query("select public.advance_work_stage($1)", [REQUEST]));
  await assert.rejects(() => as(ADMIN_ID, () => pg.query("select public.advance_work_stage($1)", [REQUEST])), rejects("last_stage"));
});
