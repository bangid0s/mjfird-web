import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { clampExtraCharacters, packageSchema, quote, type ServicePackage } from "./services/storefront";

/*
  Extra characters: 0 = the one character a package includes; each +1 adds the
  package price again (+1 = 2×, +2 = 3×). Add-ons are not multiplied. Both the
  browser preview (quote) and the database (submit_commission_request) must
  agree, and the database must refuse counts the package doesn't allow.
*/

const pkg = (over: Partial<ServicePackage> = {}): ServicePackage =>
  packageSchema.parse({ id: "emote", name: "Custom emote", price: 25, ...over });
const addons = [{ id: "rush", name: "Rush", description: "", price: 10 }];

test("packages default to no extra characters", () => {
  assert.equal(pkg().extra_characters_max, 0);
  assert.equal(packageSchema.safeParse({ id: "x", name: "X", price: 1, extra_characters_max: 99 }).success, false);
});

test("each extra character adds the package price again; add-ons are not multiplied", () => {
  const p = [pkg({ extra_characters_max: 5 })];
  assert.equal(quote(p, addons, "emote", [], 0)?.total, 25);
  assert.equal(quote(p, addons, "emote", [], 1)?.total, 50);
  assert.equal(quote(p, addons, "emote", [], 2)?.total, 75);
  const withRush = quote(p, addons, "emote", ["rush"], 1)!;
  assert.deepEqual(
    { extra: withRush.extraCharacters, subtotal: withRush.subtotal, addons: withRush.addonsTotal, total: withRush.total },
    { extra: 1, subtotal: 50, addons: 10, total: 60 },
  );
});

test("the count is clamped to what the package allows", () => {
  assert.equal(quote([pkg()], [], "emote", [], 3)?.total, 25, "package without extra characters ignores the count");
  assert.equal(quote([pkg({ extra_characters_max: 2 })], [], "emote", [], 9)?.extraCharacters, 2);
  assert.equal(clampExtraCharacters(pkg({ extra_characters_max: 2 }), -4), 0);
  assert.equal(clampExtraCharacters(pkg({ extra_characters_max: 2 }), "abc"), 0);
  assert.equal(clampExtraCharacters(undefined, 2), 0);
});

/* ---------------- database ---------------- */

const migration = readFileSync(new URL("../../supabase/migrations/0035_extra_characters.sql", import.meta.url), "utf8");
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_ID = "66666666-6666-4666-8666-666666666666";

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type content_status as enum ('draft', 'scheduled', 'published');
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create role anon nologin;
    create role authenticated nologin;
    create table services (
      id uuid primary key, title text not null, slug text not null,
      status content_status not null default 'published',
      availability text not null default 'open',
      slots_total int, slots_taken int not null default 0,
      packages jsonb not null default '[]', addons jsonb not null default '[]'
    );
    create table commission_requests (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null, service_id uuid, service_title text not null, service_slug text not null,
      package_id text not null, package_name text not null, package_price numeric(10, 2) not null,
      delivery_days int, revisions int, addons jsonb not null default '[]',
      estimated_total numeric(10, 2) not null, waitlisted boolean not null default false,
      status commission_status not null default 'pending',
      contact_name text not null, contact_email text not null, brief text not null,
      answers jsonb not null default '[]', reference_paths text[] not null default '{}'
    );
  `);
  // Re-applying must be safe.
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`
    insert into auth.users values ('${CLIENT_ID}', 'client@example.com');
    insert into services (id, title, slug, packages, addons) values (
      '${SERVICE_ID}', 'Emotes', 'emotes',
      '[{"id":"custom","name":"Custom emote","price":25,"extra_characters_max":3},
        {"id":"ych","name":"YCH emote","price":12}]',
      '[{"id":"rush","name":"Rush","price":10}]'
    );
    select set_config('request.jwt.claim.sub', '${CLIENT_ID}', false);
  `);

  const submit = (packageId: string, addonIds: string[], extra: number | null) =>
    pg.query<{ id: string }>(
      "select public.submit_commission_request($1, $2, $3, 'Rina', 'Three emotes for my channel please', '[]'::jsonb, '{}', $4) as id",
      [SERVICE_ID, packageId, addonIds, extra],
    );
  const row = async (id: string) =>
    (
      await pg.query<{ estimated_total: string; package_price: string; extra_characters: number }>(
        "select estimated_total, package_price, extra_characters from commission_requests where id = $1",
        [id],
      )
    ).rows[0];
  return { pg, submit, row };
}

test("database prices extra characters at the package price each", async () => {
  const { submit, row } = await createDb();
  const one = await row((await submit("custom", ["rush"], 2)).rows[0].id);
  assert.deepEqual(one, { estimated_total: "85.00", package_price: "25.00", extra_characters: 2 });
  const none = await row((await submit("custom", [], null)).rows[0].id);
  assert.deepEqual(none, { estimated_total: "25.00", package_price: "25.00", extra_characters: 0 });
});

test("database refuses counts the package doesn't allow", async () => {
  const { submit } = await createDb();
  await assert.rejects(submit("custom", [], 4), /invalid_characters/);
  await assert.rejects(submit("custom", [], -1), /invalid_characters/);
  await assert.rejects(submit("ych", [], 1), /invalid_characters/, "package without the option");
});

test("old 7-argument callers still resolve to the one function", async () => {
  const { pg } = await createDb();
  const res = await pg.query<{ n: number }>(
    "select count(*)::int as n from pg_proc where proname = 'submit_commission_request'",
  );
  assert.equal(res.rows[0].n, 1);
  const id = await pg.query<{ id: string }>(
    "select public.submit_commission_request($1, 'custom', '{}', 'Rina', 'One emote for my channel please', '[]'::jsonb, '{}') as id",
    [SERVICE_ID],
  );
  assert.ok(id.rows[0].id);
});
