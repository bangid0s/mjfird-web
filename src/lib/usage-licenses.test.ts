import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { DEFAULT_LICENSES, offeredLicenses, packageSchema, parseLicenses, quote } from "./services/storefront";

/*
  Usage licenses: personal use (default, +0%), monetized content (+50%) and
  commercial merchandising (+100%) — a percentage of package × characters +
  add-ons. The admin can rename, re-price or switch off the paid tiers per
  service. The browser preview and the database must agree.
*/

const packages = [packageSchema.parse({ id: "emote", name: "Custom emote", price: 25, extra_characters_max: 3 })];
const addons = [{ id: "rush", name: "Rush", description: "", price: 10 }];

test("services without stored licenses get the three defaults", () => {
  assert.deepEqual(parseLicenses(null), DEFAULT_LICENSES);
  assert.deepEqual(parseLicenses("not json"), DEFAULT_LICENSES);
  assert.deepEqual(
    DEFAULT_LICENSES.map((l) => [l.id, l.percent]),
    [["personal", 0], ["monetized", 50], ["commercial", 100]],
  );
});

test("stored overrides apply, but personal use can't be switched off", () => {
  const lic = parseLicenses([
    { id: "personal", name: "Personal", percent: 0, enabled: false },
    { id: "commercial", name: "Merch", percent: 150, enabled: false },
    { id: "bogus", name: "Nope", percent: 1 },
  ]);
  assert.deepEqual(lic.map((l) => l.id), ["personal", "monetized", "commercial"]);
  assert.equal(lic[0].enabled, true);
  assert.equal(lic[2].name, "Merch");
  assert.deepEqual(offeredLicenses(lic).map((l) => l.id), ["personal", "monetized"]);
});

test("license surcharge is a percentage of package × characters + add-ons", () => {
  // (25 × 2 + 10) = 60
  const personal = quote(packages, addons, "emote", ["rush"], 1)!;
  assert.deepEqual([personal.licenseId, personal.licenseFee, personal.total], ["personal", 0, 60]);
  const monetized = quote(packages, addons, "emote", ["rush"], 1, DEFAULT_LICENSES, "monetized")!;
  assert.deepEqual([monetized.licensePercent, monetized.licenseFee, monetized.total], [50, 30, 90]);
  const commercial = quote(packages, addons, "emote", ["rush"], 1, DEFAULT_LICENSES, "commercial")!;
  assert.deepEqual([commercial.licenseFee, commercial.total], [60, 120]);
});

test("unknown or switched-off licenses fall back to personal use", () => {
  const noMerch = parseLicenses([{ id: "commercial", name: "Merch", percent: 100, enabled: false }]);
  assert.equal(quote(packages, [], "emote", [], 0, noMerch, "commercial")?.licenseId, "personal");
  assert.equal(quote(packages, [], "emote", [], 0, DEFAULT_LICENSES, "whatever")?.total, 25);
});

/* ---------------- database ---------------- */

const migrations = ["0035_extra_characters.sql", "0036_usage_licenses.sql"].map((f) =>
  readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), "utf8"),
);
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_ID = "66666666-6666-4666-8666-666666666666";

async function createDb(licenses: string) {
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
  // Both, twice: re-applying must be safe.
  for (const m of [...migrations, ...migrations]) await pg.exec(m);
  await pg.exec(`
    insert into auth.users values ('${CLIENT_ID}', 'client@example.com');
    insert into services (id, title, slug, packages, addons, licenses) values (
      '${SERVICE_ID}', 'Emotes', 'emotes',
      '[{"id":"emote","name":"Custom emote","price":25,"extra_characters_max":3}]',
      '[{"id":"rush","name":"Rush","price":10}]',
      '${licenses}'
    );
    select set_config('request.jwt.claim.sub', '${CLIENT_ID}', false);
  `);

  const submit = (license: string | null, extra = 1) =>
    pg.query<{ id: string }>(
      "select public.submit_commission_request($1, 'emote', '{rush}', 'Rina', 'Two emotes for my channel please', '[]'::jsonb, '{}', $2, $3) as id",
      [SERVICE_ID, extra, license],
    );
  const row = async (id: string) =>
    (
      await pg.query<Record<string, unknown>>(
        "select license_id, license_name, license_percent::text, license_fee::text, estimated_total::text from commission_requests where id = $1",
        [id],
      )
    ).rows[0];
  return { pg, submit, row };
}

test("database prices licenses from the defaults when the service stores none", async () => {
  const { submit, row } = await createDb("[]");
  assert.deepEqual(await row((await submit(null)).rows[0].id), {
    license_id: "personal", license_name: "Personal use", license_percent: "0.00", license_fee: "0.00", estimated_total: "60.00",
  });
  assert.deepEqual(await row((await submit("monetized")).rows[0].id), {
    license_id: "monetized", license_name: "Monetized content", license_percent: "50.00", license_fee: "30.00", estimated_total: "90.00",
  });
  assert.deepEqual(await row((await submit("commercial")).rows[0].id), {
    license_id: "commercial", license_name: "Commercial merchandising", license_percent: "100.00", license_fee: "60.00", estimated_total: "120.00",
  });
});

test("database uses the service's own percentages and refuses disabled or unknown licenses", async () => {
  const { submit, row } = await createDb(
    JSON.stringify([
      { id: "monetized", name: "Streaming", percent: 25, enabled: true },
      { id: "commercial", name: "Merch", percent: 100, enabled: false },
    ]),
  );
  const own = await row((await submit("monetized")).rows[0].id);
  assert.deepEqual([own.license_name, own.license_fee, own.estimated_total], ["Streaming", "15.00", "75.00"]);
  await assert.rejects(submit("commercial"), /invalid_license/);
  await assert.rejects(submit("resale"), /invalid_license/);
});

test("older callers (8 and 7 arguments) still work and get personal use", async () => {
  const { pg, row } = await createDb("[]");
  const n = await pg.query<{ n: number }>("select count(*)::int as n from pg_proc where proname = 'submit_commission_request'");
  assert.equal(n.rows[0].n, 1);
  const id = await pg.query<{ id: string }>(
    "select public.submit_commission_request($1, 'emote', '{}', 'Rina', 'One emote for my channel please', '[]'::jsonb, '{}') as id",
    [SERVICE_ID],
  );
  const r = await row(id.rows[0].id);
  assert.deepEqual([r.license_id, r.estimated_total], ["personal", "25.00"]);
});
