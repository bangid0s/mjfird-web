import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../supabase/migrations/0044_notifications.sql", import.meta.url), "utf8");

const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type content_status as enum ('draft', 'scheduled', 'published');
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create schema if not exists auth;
    create table auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table admins (user_id uuid primary key);
    create or replace function public.is_admin()
    returns boolean language sql stable security definer set search_path = public as $$
      select exists (select 1 from public.admins where user_id = auth.uid());
    $$;
    create table commission_requests (
      id uuid primary key,
      ref bigint not null,
      client_id uuid not null,
      service_title text not null,
      package_name text not null,
      contact_name text not null,
      status commission_status not null default 'pending',
      payment_url text,
      delivery_url text,
      delivery_paths text[] not null default '{}'
    );
    create table commission_messages (
      id uuid primary key default gen_random_uuid(),
      request_id uuid not null references commission_requests (id) on delete cascade,
      from_admin boolean not null default false,
      body text not null
    );
    create table testimonials (
      id uuid primary key default gen_random_uuid(),
      request_id uuid,
      status content_status not null default 'draft'
    );
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant select, insert, update on commission_requests, commission_messages, testimonials to authenticated;
    insert into auth.users values ('${CLIENT_ID}'), ('${OTHER_ID}'), ('${ADMIN_ID}');
    insert into admins values ('${ADMIN_ID}');
  `);
  // Running it twice proves it is safe to re-apply.
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`grant select on notifications to authenticated;`);

  async function as<T>(uid: string | null, fn: () => Promise<T>) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
    await pg.exec("set role authenticated");
    try {
      return await fn();
    } finally {
      await pg.exec("reset role");
      await pg.exec(`select set_config('request.jwt.claim.sub', '', false)`);
    }
  }

  async function inbox(uid: string) {
    const res = await pg.query<{ kind: string; title: string; body: string; href: string; read: boolean }>(
      "select kind, title, body, href, read_at is not null as read from notifications where user_id = $1 order by created_at, kind",
      [uid],
    );
    return res.rows;
  }

  async function newRequest() {
    await as(CLIENT_ID, () =>
      pg.query(
        `insert into commission_requests (id, ref, client_id, service_title, package_name, contact_name)
         values ($1, 1001, $2, 'Character Illustration', 'Bust', 'Rina')`,
        [REQUEST_ID, CLIENT_ID],
      ),
    );
  }

  const adminUpdate = (sql: string) => as(ADMIN_ID, () => pg.query(`update commission_requests set ${sql} where id = $1`, [REQUEST_ID]));

  return { pg, as, inbox, newRequest, adminUpdate };
}

test("0044 is additive", () => {
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\bdrop\s+column\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
});

test("a new request notifies the studio, not the client", async () => {
  const { inbox, newRequest } = await createDb();
  await newRequest();
  const admin = await inbox(ADMIN_ID);
  assert.equal(admin.length, 1);
  assert.equal(admin[0].kind, "request_new");
  assert.equal(admin[0].title, "New request #1001");
  assert.equal(admin[0].href, `/admin/requests/${REQUEST_ID}`);
  assert.deepEqual(await inbox(CLIENT_ID), []);
});

test("each step of the order reaches the client", async () => {
  const { inbox, newRequest, adminUpdate } = await createDb();
  await newRequest();
  await adminUpdate("status = 'awaiting_payment'");
  await adminUpdate("payment_url = 'https://paypal.me/mjfird/40'");
  await adminUpdate("status = 'in_progress'");
  await adminUpdate("delivery_paths = array['x/deliveries/y/final.png']");
  await adminUpdate("status = 'delivered'");
  await adminUpdate("status = 'completed'");

  const kinds = (await inbox(CLIENT_ID)).map((n) => n.kind);
  assert.deepEqual(kinds, [
    "request_accepted",
    "payment_ready",
    "request_paid",
    "files_added",
    "request_delivered",
    "request_completed",
  ]);
  for (const n of await inbox(CLIENT_ID)) assert.equal(n.href, `/account/requests/${REQUEST_ID}`);
  // The admin who made the change isn't told about it.
  assert.deepEqual((await inbox(ADMIN_ID)).map((n) => n.kind), ["request_new"]);
});

test("a PayPal capture (no session) tells both sides", async () => {
  const { pg, inbox, newRequest, adminUpdate } = await createDb();
  await newRequest();
  await adminUpdate("status = 'awaiting_payment'");
  await pg.query("update commission_requests set status = 'in_progress' where id = $1", [REQUEST_ID]);
  assert.ok((await inbox(CLIENT_ID)).some((n) => n.kind === "request_paid"));
  assert.ok((await inbox(ADMIN_ID)).some((n) => n.kind === "request_paid"));
});

test("cancel goes to whoever didn't do it", async () => {
  const a = await createDb();
  await a.newRequest();
  await a.as(CLIENT_ID, () => a.pg.query("update commission_requests set status = 'cancelled' where id = $1", [REQUEST_ID]));
  assert.ok((await a.inbox(ADMIN_ID)).some((n) => n.kind === "request_cancelled"));
  assert.ok(!(await a.inbox(CLIENT_ID)).some((n) => n.kind === "request_cancelled"));

  const b = await createDb();
  await b.newRequest();
  await b.adminUpdate("status = 'cancelled'");
  assert.ok((await b.inbox(CLIENT_ID)).some((n) => n.kind === "request_cancelled"));
});

test("messages notify the other side with a one-line preview", async () => {
  const { pg, as, inbox, newRequest } = await createDb();
  await newRequest();
  await as(ADMIN_ID, () =>
    pg.query("insert into commission_messages (request_id, from_admin, body) values ($1, true, $2)", [REQUEST_ID, "Sketch is up!\n\nLet me know."]),
  );
  await as(CLIENT_ID, () =>
    pg.query("insert into commission_messages (request_id, from_admin, body) values ($1, false, 'Looks great')", [REQUEST_ID]),
  );
  const client = (await inbox(CLIENT_ID)).filter((n) => n.kind === "message");
  assert.equal(client.length, 1);
  assert.equal(client[0].body, "Sketch is up! Let me know.");
  const admin = (await inbox(ADMIN_ID)).filter((n) => n.kind === "message");
  assert.equal(admin.length, 1);
  assert.equal(admin[0].title, "Rina wrote on #1001");
});

test("reviews: studio hears about new ones, client hears when published", async () => {
  const { pg, as, inbox, newRequest } = await createDb();
  await newRequest();
  await as(CLIENT_ID, () => pg.query("insert into testimonials (request_id) values ($1)", [REQUEST_ID]));
  assert.ok((await inbox(ADMIN_ID)).some((n) => n.kind === "review_new"));
  await as(ADMIN_ID, () => pg.query("update testimonials set status = 'published' where request_id = $1", [REQUEST_ID]));
  assert.ok((await inbox(CLIENT_ID)).some((n) => n.kind === "review_published"));
});

test("clients only see and clear their own notifications", async () => {
  const { pg, as, inbox, newRequest, adminUpdate } = await createDb();
  await newRequest();
  await adminUpdate("status = 'awaiting_payment'");
  await adminUpdate("status = 'declined'");

  const seen = await as(OTHER_ID, () => pg.query("select id from notifications"));
  assert.equal(seen.rows.length, 0);
  const cleared = await as(OTHER_ID, () => pg.query<{ n: number }>("select public.mark_notifications_read() as n"));
  assert.equal(cleared.rows[0].n, 0);

  const mine = await as(CLIENT_ID, () => pg.query("select id from notifications"));
  assert.equal(mine.rows.length, 2);
  const byRequest = await as(CLIENT_ID, () =>
    pg.query<{ n: number }>("select public.mark_notifications_read(null, $1) as n", [REQUEST_ID]),
  );
  assert.equal(byRequest.rows[0].n, 2);
  assert.ok((await inbox(CLIENT_ID)).every((n) => n.read));
  assert.ok((await inbox(ADMIN_ID)).every((n) => !n.read), "admin's rows untouched");
});

test("the browser can't write notifications directly", async () => {
  const { pg } = await createDb();
  const res = await pg.query<{ ins: boolean; notify: boolean }>(
    `select has_table_privilege('authenticated', 'notifications', 'insert') as ins,
            has_function_privilege('authenticated', 'public.notify_user(uuid, text, text, text, text, uuid)', 'execute') as notify`,
  );
  assert.equal(res.rows[0].ins, false);
  assert.equal(res.rows[0].notify, false);
});
