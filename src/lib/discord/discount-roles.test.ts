import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { DiscordConfig } from "./config";
import type { FetchLike } from "./api";
import { clampPercent, loadDiscountRoles, parseDiscountForm, rolesFromRows } from "./discount-roles";
import { syncDiscordLink } from "./sync";

const CLIENT_ROLE = "333333333333333333";
const VIP_ROLE = "333333333333333334";
const ENV = [{ roleId: CLIENT_ROLE, percent: 5 }];

// --- pure helpers ------------------------------------------------------------

test("clampPercent keeps 0–50 with two decimals", () => {
  assert.equal(clampPercent("12.345"), 12.35);
  assert.equal(clampPercent(80), 50);
  assert.equal(clampPercent("-3"), 0);
  assert.equal(clampPercent(""), 0);
  assert.equal(clampPercent("abc"), 0);
  assert.equal(clampPercent(undefined), 0);
});

test("rolesFromRows drops 0% and bad ids, highest first", () => {
  assert.deepEqual(
    rolesFromRows([
      { role_id: CLIENT_ROLE, percent: "5.00" },
      { role_id: VIP_ROLE, percent: 10 },
      { role_id: "444444444444444444", percent: 0 },
      { role_id: "not-a-role", percent: 20 },
    ]),
    [
      { roleId: VIP_ROLE, percent: 10 },
      { roleId: CLIENT_ROLE, percent: 5 },
    ],
  );
});

test("parseDiscountForm reads pct:/name: pairs and ignores everything else", () => {
  const form = new FormData();
  form.set("source", "discord");
  form.set(`pct:${CLIENT_ROLE}`, "7.5");
  form.set(`name:${CLIENT_ROLE}`, "  Client ");
  form.set(`pct:${VIP_ROLE}`, "99");
  form.set("pct:../../etc", "10");
  assert.deepEqual(parseDiscountForm(form), [
    { roleId: CLIENT_ROLE, name: "Client", percent: 7.5 },
    { roleId: VIP_ROLE, name: "", percent: 50 },
  ]);
});

// --- loading -----------------------------------------------------------------

function tableDb(result: { data?: unknown; error?: { message: string } | null } | Error) {
  return {
    from(table: string) {
      assert.equal(table, "discord_discount_roles");
      return { select: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)) };
    },
  } as never;
}

test("an empty table falls back to the environment variable", async () => {
  assert.deepEqual(await loadDiscountRoles(tableDb({ data: [], error: null }), ENV), ENV);
  assert.deepEqual(await loadDiscountRoles(null, ENV), ENV);
});

test("a saved list replaces the environment variable, even when it is all 0%", async () => {
  assert.deepEqual(await loadDiscountRoles(tableDb({ data: [{ role_id: VIP_ROLE, percent: "15" }], error: null }), ENV), [
    { roleId: VIP_ROLE, percent: 15 },
  ]);
  assert.deepEqual(await loadDiscountRoles(tableDb({ data: [{ role_id: CLIENT_ROLE, percent: 0 }], error: null }), ENV), []);
});

test("a database error falls back instead of failing the role check", async () => {
  assert.deepEqual(await loadDiscountRoles(tableDb({ data: null, error: { message: "down" } }), ENV), ENV);
  assert.deepEqual(await loadDiscountRoles(tableDb(new Error("network")), ENV), ENV);
});

// --- the sync uses the saved list ---------------------------------------------

test("syncDiscordLink applies the admin's percent, not the env one", async () => {
  const GUILD = "111111111111111111";
  const LINKED = "222222222222222222";
  const USER = "555555555555555555";
  const config: DiscordConfig = { botToken: "t", guildId: GUILD, linkedRoleId: LINKED, discountRoles: ENV, inviteUrl: null };
  const upserts: Record<string, unknown>[] = [];
  const db = {
    from(table: string) {
      if (table === "discord_discount_roles") {
        return { select: () => Promise.resolve({ data: [{ role_id: CLIENT_ROLE, percent: 12 }], error: null }) };
      }
      return {
        upsert(row: Record<string, unknown>) {
          upserts.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as never;
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith(`/members/${USER}`)) return new Response(JSON.stringify({ roles: [CLIENT_ROLE, LINKED] }), { status: 200 });
    if (url.endsWith("/roles")) return new Response(JSON.stringify([{ id: CLIENT_ROLE, name: "Client", color: 0, position: 1 }]), { status: 200 });
    return new Response(null, { status: 500 });
  };
  const result = await syncDiscordLink("client-1", { discordUserId: USER, username: "fird" }, { config, db, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(upserts[0].discount_percent, 12);
  assert.equal(upserts[0].discount_label, "Client");
});

// --- migration: who can read and write the list ----------------------------------

const migration = readFileSync(new URL("../../../supabase/migrations/0046_discord_discount_roles.sql", import.meta.url), "utf8");
const ADMIN = "55555555-5555-4555-8555-555555555555";
const CLIENT = "22222222-2222-4222-8222-222222222222";

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table admins (user_id uuid primary key);
    create or replace function public.is_admin()
    returns boolean language sql stable security definer set search_path = public as $$
      select exists (select 1 from public.admins where user_id = auth.uid());
    $$;
    create role authenticated nologin;
    grant usage on schema public to authenticated;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  await pg.exec(migration);
  await pg.exec(migration); // safe to re-apply
  await pg.exec(`
    alter table discord_discount_roles force row level security;
    grant select, insert, update, delete on discord_discount_roles to authenticated;
    insert into admins values ('${ADMIN}');
  `);
  return pg;
}

async function as<T>(pg: PGlite, user: string, run: () => Promise<T>) {
  await pg.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await run();
  } finally {
    await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

test("only an admin can read or change the discount list", async () => {
  const pg = await createDb();
  await as(pg, ADMIN, () => pg.exec(`insert into discord_discount_roles (role_id, role_name, percent) values ('${CLIENT_ROLE}', 'Client', 5)`));

  const seen = await as(pg, CLIENT, () => pg.query("select * from discord_discount_roles"));
  assert.equal(seen.rows.length, 0);
  await assert.rejects(
    as(pg, CLIENT, () => pg.exec(`insert into discord_discount_roles (role_id, percent) values ('${VIP_ROLE}', 50)`)),
    /row-level security/,
  );
  await as(pg, CLIENT, () => pg.exec(`update discord_discount_roles set percent = 50`));
  const after = await pg.query<{ percent: string }>("select percent from discord_discount_roles");
  assert.equal(Number(after.rows[0].percent), 5);
});

test("the table refuses percents over 50 and ids that aren't Discord ids", async () => {
  const pg = await createDb();
  await assert.rejects(pg.exec(`insert into discord_discount_roles (role_id, percent) values ('${VIP_ROLE}', 51)`), /check/);
  await assert.rejects(pg.exec(`insert into discord_discount_roles (role_id, percent) values ('abc', 5)`), /check/);
});
