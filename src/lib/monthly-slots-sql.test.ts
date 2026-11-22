import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../supabase/migrations/0056_monthly_slots.sql", import.meta.url), "utf8");

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create table public.admins (user_id uuid primary key);
    create function public.is_admin() returns boolean language sql as $$ select false $$;
    create table public.site_settings (id uuid primary key default gen_random_uuid());
    insert into public.site_settings default values;
    create table public.commission_requests (
      id uuid primary key default gen_random_uuid(),
      status text not null default 'pending',
      accepted_at timestamptz,
      waitlisted boolean not null default false
    );
  `);
  await pg.exec(migration);
  return pg;
}

const slots = async (pg: PGlite) =>
  (await pg.query<{ total: number | null; taken: number }>("select * from public.commission_slots()")).rows[0];

test("starts at 6 slots and re-running keeps the admin's own number", async () => {
  const pg = await createDb();
  assert.deepEqual(await slots(pg), { total: 6, taken: 0 });
  await pg.exec("update public.site_settings set monthly_slots = 8");
  await pg.exec(migration);
  assert.equal((await slots(pg)).total, 8);
});

test("counts requests accepted this month; cancelled ones and last month's free their slot", async () => {
  const pg = await createDb();
  await pg.exec(`
    insert into public.commission_requests (status, accepted_at) values
      ('in_progress', now()),
      ('awaiting_payment', now()),
      ('cancelled', now()),
      ('pending', null),
      ('completed', now() - interval '45 days');
  `);
  assert.equal((await slots(pg)).taken, 2);
});

test("a full month sends new requests to the waitlist; an open one doesn't", async () => {
  const pg = await createDb();
  await pg.exec("update public.site_settings set monthly_slots = 1");
  await pg.exec("insert into public.commission_requests default values");
  let { rows } = await pg.query<{ waitlisted: boolean }>("select waitlisted from public.commission_requests");
  assert.equal(rows[0].waitlisted, false);

  await pg.exec("update public.commission_requests set status = 'in_progress', accepted_at = now()");
  await pg.exec("insert into public.commission_requests default values");
  ({ rows } = await pg.query<{ waitlisted: boolean }>("select waitlisted from public.commission_requests where accepted_at is null"));
  assert.equal(rows[0].waitlisted, true);

  await pg.exec("update public.site_settings set monthly_slots = null");
  await pg.exec("insert into public.commission_requests default values");
  ({ rows } = await pg.query<{ waitlisted: boolean }>(
    "select waitlisted from public.commission_requests where accepted_at is null order by waitlisted limit 1",
  ));
  assert.equal(rows[0].waitlisted, false, "no capacity set means unlimited");
});

test("waitlist emails: valid, one per address (any case), unreadable by the public", async () => {
  const pg = await createDb();
  await pg.exec(`insert into public.slot_waitlist (email, service_slug) values ('Rina@Example.com', 'dnd-character')`);
  await assert.rejects(pg.exec(`insert into public.slot_waitlist (email) values ('rina@example.com')`));
  await assert.rejects(pg.exec(`insert into public.slot_waitlist (email) values ('not-an-email')`));
  await pg.exec("grant select, insert on public.slot_waitlist to anon");
  await pg.exec("set role anon");
  await pg.exec(`insert into public.slot_waitlist (email) values ('toban@example.com')`);
  const { rows } = await pg.query("select * from public.slot_waitlist");
  assert.equal(rows.length, 0, "the public can add an email but never read the list");
});
