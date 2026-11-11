import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { DEFAULT_LICENSES, packageSchema, quote } from "./services/storefront";

/*
  Background is a pick-one choice (radio list), not an add-on. The first option
  is the default; the price is flat (not multiplied by characters) and counts
  toward the usage-license base. The browser preview and the database agree.
*/

const packages = [packageSchema.parse({ id: "bust", name: "Bust", price: 60, extra_characters_max: 2 })];
const backgrounds = [
  { id: "none", name: "No background", description: "", price: 0 },
  { id: "detailed", name: "Detailed", description: "", price: 40 },
];

test("no backgrounds offered → no background on the quote", () => {
  const q = quote(packages, [], "bust", [], 0)!;
  assert.deepEqual([q.backgroundId, q.backgroundPrice, q.total], [null, 0, 60]);
});

test("first background is the default; unknown ids fall back to it", () => {
  assert.equal(quote(packages, [], "bust", [], 0, DEFAULT_LICENSES, "personal", backgrounds)?.backgroundId, "none");
  assert.equal(quote(packages, [], "bust", [], 0, DEFAULT_LICENSES, "personal", backgrounds, "nope")?.backgroundId, "none");
});

test("background price is flat and included in the license base", () => {
  // 60 × 2 characters + 40 background = 160; commercial +100% → 320
  const q = quote(packages, [], "bust", [], 1, DEFAULT_LICENSES, "commercial", backgrounds, "detailed")!;
  assert.deepEqual([q.subtotal, q.backgroundPrice, q.licenseFee, q.total], [120, 40, 160, 320]);
});

/* ---------------- database ---------------- */

const migrations = ["0035_extra_characters.sql", "0036_usage_licenses.sql", "0037_background_options.sql"].map((f) =>
  readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), "utf8"),
);
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_ID = "66666666-6666-4666-8666-666666666666";

async function createDb(addons: string) {
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
    insert into auth.users values ('${CLIENT_ID}', 'client@example.com');
  `);
  // 0035 + 0036 first, then the service (with its old add-ons), then 0037 twice.
  await pg.exec(migrations[0]);
  await pg.exec(migrations[1]);
  await pg.exec(`
    insert into services (id, title, slug, packages, addons) values (
      '${SERVICE_ID}', 'Portraits', 'portraits',
      '[{"id":"bust","name":"Bust","price":60,"extra_characters_max":2}]',
      '${addons}'
    );
    select set_config('request.jwt.claim.sub', '${CLIENT_ID}', false);
  `);
  await pg.exec(migrations[2]);
  await pg.exec(migrations[2]);

  const submit = (background: string | null, license = "personal") =>
    pg.query<{ id: string }>(
      "select public.submit_commission_request($1, 'bust', '{}', 'Rina', 'A bust portrait of my OC please', '[]'::jsonb, '{}', 1, $2, $3) as id",
      [SERVICE_ID, license, background],
    );
  const row = async (id: string) =>
    (
      await pg.query<Record<string, unknown>>(
        "select background_id, background_name, background_price::text, license_fee::text, estimated_total::text from commission_requests where id = $1",
        [id],
      )
    ).rows[0];
  return { pg, submit, row };
}

test("migration moves background add-ons into the pick-one list behind a free default", async () => {
  const { pg } = await createDb(
    JSON.stringify([
      { id: "bg", name: "Detailed background", price: 40 },
      { id: "rush", name: "Rush", price: 10 },
    ]),
  );
  const s = (await pg.query<{ backgrounds: { id: string }[]; addons: { id: string }[] }>("select backgrounds, addons from services")).rows[0];
  assert.deepEqual(s.backgrounds.map((b) => b.id), ["none", "bg"], "re-running the migration doesn't duplicate");
  assert.deepEqual(s.addons.map((a) => a.id), ["rush"]);
  const n = await pg.query<{ n: number }>("select count(*)::int as n from pg_proc where proname = 'submit_commission_request'");
  assert.equal(n.rows[0].n, 1);
});

test("database prices the chosen background, defaults to the first and refuses unknown ones", async () => {
  const { submit, row } = await createDb(JSON.stringify([{ id: "bg", name: "Detailed background", price: 40 }]));
  assert.deepEqual(await row((await submit(null)).rows[0].id), {
    background_id: "none", background_name: "No background", background_price: "0.00", license_fee: "0.00", estimated_total: "120.00",
  });
  assert.deepEqual(await row((await submit("bg", "commercial")).rows[0].id), {
    background_id: "bg", background_name: "Detailed background", background_price: "40.00", license_fee: "160.00", estimated_total: "320.00",
  });
  await assert.rejects(submit("castle"), /invalid_background/);
});

test("services without background options record none", async () => {
  const { submit, row } = await createDb("[]");
  assert.deepEqual(await row((await submit(null)).rows[0].id), {
    background_id: null, background_name: null, background_price: "0.00", license_fee: "0.00", estimated_total: "120.00",
  });
});
