import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = ["0043_discord_link_discounts.sql", "0044_discord_role_list_and_labels.sql"]
  .map((f) => readFileSync(new URL(`../../../supabase/migrations/${f}`, import.meta.url), "utf8"))
  .join("\n");

const CLIENT = "22222222-2222-4222-8222-222222222222";
const OTHER = "44444444-4444-4444-8444-444444444444";
const ADMIN = "55555555-5555-4555-8555-555555555555";

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
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
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null,
      estimated_total numeric(10, 2) not null
    );
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  // Twice: the migration must be safe to re-apply.
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`
    alter table client_discord_links force row level security;
    grant select, insert, update, delete on client_discord_links to anon, authenticated;
    insert into auth.users values ('${CLIENT}'), ('${OTHER}'), ('${ADMIN}');
    insert into admins values ('${ADMIN}');
  `);
  return pg;
}

async function link(
  pg: PGlite,
  values: { client?: string; inGuild?: boolean; pastClient?: boolean; percent?: number; age?: string; label?: string | null },
) {
  await pg.query(
    `insert into client_discord_links (client_id, discord_user_id, in_guild, past_client, discount_percent, synced_at, discount_label)
     values ($1, $2, $3, $4, $5, now() - $6::interval, $7)
     on conflict (client_id) do update set in_guild = excluded.in_guild, past_client = excluded.past_client,
       discount_percent = excluded.discount_percent, synced_at = excluded.synced_at, discount_label = excluded.discount_label`,
    [
      values.client ?? CLIENT,
      values.client === OTHER ? "999999999999999999" : "444444444444444444",
      values.inGuild ?? true,
      values.pastClient ?? true,
      values.percent ?? 10,
      values.age ?? "0 minutes",
      values.label === undefined ? "VIP Client" : values.label,
    ],
  );
}

async function order(pg: PGlite, total: number, client = CLIENT) {
  const r = await pg.query<{ estimated_total: string; discount_percent: string; discount_amount: string; discount_label: string | null }>(
    `insert into commission_requests (client_id, estimated_total) values ($1, $2)
     returning estimated_total::text, discount_percent::text, discount_amount::text, discount_label`,
    [client, total],
  );
  return r.rows[0];
}

async function as(pg: PGlite, uid: string, sql: string, params: unknown[] = []) {
  await pg.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return await pg.query(sql, params);
  } finally {
    await pg.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

test("a freshly verified client gets the percent off, rounded like money, labelled with their role", async () => {
  const pg = await createDb();
  await link(pg, {});
  assert.deepEqual(await order(pg, 55.55), { estimated_total: "49.99", discount_percent: "10.00", discount_amount: "5.56", discount_label: "VIP Client" });
  await link(pg, { percent: 5, label: "Client" });
  assert.deepEqual(await order(pg, 100), { estimated_total: "95.00", discount_percent: "5.00", discount_amount: "5.00", discount_label: "Client" });
  await link(pg, { label: null });
  assert.equal((await order(pg, 100)).discount_label, "Client discount", "falls back when the role name is unknown");
});

test("the role list column defaults to an empty list", async () => {
  const pg = await createDb();
  await link(pg, {});
  const r = await pg.query<{ roles: unknown }>("select roles from client_discord_links where client_id = $1", [CLIENT]);
  assert.deepEqual(r.rows[0].roles, []);
});

test("no discount without a link, without the role, outside the server, or when the check is stale", async () => {
  const pg = await createDb();
  const none = { estimated_total: "100.00", discount_percent: "0.00", discount_amount: "0.00", discount_label: null };
  assert.deepEqual(await order(pg, 100), none);
  await link(pg, { pastClient: false, percent: 0 });
  assert.deepEqual(await order(pg, 100), none);
  await link(pg, { inGuild: false });
  assert.deepEqual(await order(pg, 100), none);
  await link(pg, { age: "61 minutes" });
  assert.deepEqual(await order(pg, 100), none);
  await link(pg, {});
  assert.equal((await order(pg, 100, OTHER)).discount_amount, "0.00", "another client's link never applies");
});

test("percent above 50 is refused; a free order stays free", async () => {
  const pg = await createDb();
  await assert.rejects(link(pg, { percent: 80 }), /check/);
  await link(pg, {});
  assert.equal((await order(pg, 0)).estimated_total, "0.00");
});

test("clients can read only their own link and cannot write it", async () => {
  const pg = await createDb();
  await link(pg, {});
  await link(pg, { client: OTHER });

  const own = await as(pg, CLIENT, "select client_id from client_discord_links");
  assert.deepEqual(own.rows, [{ client_id: CLIENT }]);
  const admin = await as(pg, ADMIN, "select client_id from client_discord_links");
  assert.equal(admin.rows.length, 2);

  await as(pg, CLIENT, "update client_discord_links set discount_percent = 50");
  await as(pg, CLIENT, "delete from client_discord_links");
  await assert.rejects(
    as(pg, OTHER, `insert into client_discord_links (client_id, discord_user_id, past_client, in_guild, discount_percent) values ('${ADMIN}', '1234567890123456', true, true, 50)`),
    /row-level security/,
  );
  const after = await pg.query<{ discount_percent: string }>("select discount_percent::text from client_discord_links where client_id = $1", [CLIENT]);
  assert.equal(after.rows[0].discount_percent, "10.00", "the client's update and delete changed nothing");
});

test("one Discord account can belong to only one website account", async () => {
  const pg = await createDb();
  await link(pg, {});
  await assert.rejects(
    pg.query("insert into client_discord_links (client_id, discord_user_id) values ($1, '444444444444444444')", [OTHER]),
    /unique/,
  );
});
