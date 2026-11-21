import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { DEFAULT_LICENSES, isNdaAddonName, packageSchema, quote } from "./services/storefront";

/*
  "May I publicly stream / share the work with credit?" Only "NDA required"
  costs anything: the service's flat NDA fee, charged exactly once. Not
  multiplied by extra characters, not inside the license base, and the old
  "Private / NDA" add-on is moved into it so it can't be paid twice.
*/

const packages = [packageSchema.parse({ id: "bust", name: "Bust", price: 60, extra_characters_max: 2 })];
const nda = { id: "nda-addon", name: "Private / NDA", description: "", price: 100 };
const pet = { id: "pet", name: "Pet or small companion", description: "", price: 15 };

test("NDA adds the flat fee once; the other answers add nothing", () => {
  const at = (sharing: string | null) => quote(packages, [], "bust", [], 0, DEFAULT_LICENSES, "personal", [], "", sharing, 100)!;
  assert.deepEqual([at("public").privacyFee, at("public").total], [0, 60]);
  assert.deepEqual([at("final_only").privacyFee, at("final_only").total], [0, 60]);
  assert.deepEqual([at("nda").privacyFee, at("nda").total], [100, 160]);
  assert.deepEqual([at(null).sharing, at("bogus").sharing, at("bogus").total], [null, null, 60]);
});

test("NDA fee is not multiplied by characters or by the license percentage", () => {
  // 60 × 3 characters = 180; commercial +100% = 180 → 360; NDA +100 flat → 460 (not 560 or 760).
  const q = quote(packages, [], "bust", [], 2, DEFAULT_LICENSES, "commercial", [], "", "nda", 100)!;
  assert.deepEqual([q.subtotal, q.licenseFee, q.privacyFee, q.total], [180, 180, 100, 460]);
});

test("a zero NDA fee makes NDA free", () => {
  assert.equal(quote(packages, [], "bust", [], 0, DEFAULT_LICENSES, "personal", [], "", "nda", 0)!.total, 60);
});

test("NDA add-on names are recognised; ordinary add-ons are not", () => {
  for (const n of ["Private / NDA", "NDA", "nda required", "Privacy fee", "Private commission"]) assert.ok(isNdaAddonName(n), n);
  for (const n of ["Pet or small companion", "Rush", "Agenda sketch", "Background"]) assert.ok(!isNdaAddonName(n), n);
});

/* ---------------- database ---------------- */

const read = (f: string) => readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), "utf8");
const migrations = ["0035_extra_characters.sql", "0036_usage_licenses.sql", "0037_background_options.sql", "0049_quote_requests.sql"].map(read);
const sharingMigration = read("0053_sharing_privacy.sql");
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const PRICED = "66666666-6666-4666-8666-666666666666";
const PLAIN = "77777777-7777-4777-8777-777777777777";
const QUOTE = "88888888-8888-4888-8888-888888888888";

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
    insert into auth.users values ('${CLIENT_ID}', 'client@example.com');
  `);
  for (const m of migrations) await pg.exec(m);
  await pg.exec(`
    insert into services (id, title, slug, packages, addons) values
      ('${PRICED}', 'DnD', 'dnd', '[{"id":"bust","name":"Bust","price":60,"extra_characters_max":2}]', '${JSON.stringify([pet, { ...nda, price: 120 }])}'),
      ('${PLAIN}', 'Emotes', 'emotes', '[{"id":"bust","name":"Bust","price":60,"extra_characters_max":2}]', '[]'),
      ('${QUOTE}', 'Custom', 'custom', '[]', '[]');
    select set_config('request.jwt.claim.sub', '${CLIENT_ID}', false);
  `);
  await pg.exec(sharingMigration);
  await pg.exec(sharingMigration); // safe to run again

  const submit = (service: string, sharing: string | null, addonIds: string[] = [], license = "commercial") =>
    pg.query<{ id: string }>(
      "select public.submit_commission_request($1, 'bust', $2, 'Rina', 'A bust portrait of my OC please', '[]'::jsonb, '{}', 2, $3, null, $4) as id",
      [service, addonIds, license, sharing],
    );
  const row = async (id: string) =>
    (
      await pg.query<Record<string, unknown>>(
        "select sharing, privacy_fee::text, license_fee::text, estimated_total::text, jsonb_array_length(addons) as addons from commission_requests where id = $1",
        [id],
      )
    ).rows[0];
  return { pg, submit, row };
}

test("migration moves the NDA add-on into nda_fee and removes it, once", async () => {
  const { pg } = await createDb();
  const rows = (await pg.query<{ id: string; nda_fee: string; addons: { id: string }[] }>("select id, nda_fee::text, addons from services order by id")).rows;
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(byId[PRICED].nda_fee, "120.00", "the add-on's price becomes the fee");
  assert.deepEqual(byId[PRICED].addons.map((a) => a.id), ["pet"], "only the NDA add-on is removed");
  assert.equal(byId[PLAIN].nda_fee, "100.00", "services without one get the default");
  const fns = await pg.query<{ n: number }>(
    "select count(*)::int as n from pg_proc where proname in ('submit_commission_request', 'submit_quote_request')",
  );
  assert.equal(fns.rows[0].n, 2, "old signatures are dropped");
});

test("database charges NDA once, flat, outside the license — and matches the browser quote", async () => {
  const { submit, row } = await createDb();
  // 60 × 3 = 180, commercial +100% = 180, NDA +120 → 480.
  const r = await row((await submit(PRICED, "nda")).rows[0].id);
  assert.deepEqual(r, { sharing: "nda", privacy_fee: "120.00", license_fee: "180.00", estimated_total: "480.00", addons: 0 });
  const browser = quote(packages, [], "bust", [], 2, DEFAULT_LICENSES, "commercial", [], "", "nda", 120)!;
  assert.equal(browser.total, 480);

  // A stale link still carrying the old NDA add-on id can't add it a second time.
  const stale = await row((await submit(PRICED, "nda", ["nda-addon", "pet"])).rows[0].id);
  assert.deepEqual([stale.privacy_fee, stale.addons, stale.estimated_total], ["120.00", 1, "510.00"]);
});

test("other answers cost nothing; no answer is allowed for older callers; junk is refused", async () => {
  const { submit, row } = await createDb();
  for (const s of ["public", "final_only"]) {
    assert.deepEqual(await row((await submit(PLAIN, s)).rows[0].id), {
      sharing: s, privacy_fee: "0.00", license_fee: "180.00", estimated_total: "360.00", addons: 0,
    });
  }
  assert.equal((await row((await submit(PLAIN, null)).rows[0].id)).sharing, null);
  await assert.rejects(submit(PLAIN, "maybe"), /invalid_sharing/);
});

test("custom quotes record the answer without adding a fee", async () => {
  const { pg, row } = await createDb();
  const { rows } = await pg.query<{ id: string }>(
    "select public.submit_quote_request($1, 'Rina', 'A custom piece for my book cover', '[]'::jsonb, '{}', 'nda') as id",
    [QUOTE],
  );
  const r = await row(rows[0].id);
  assert.deepEqual([r.sharing, r.privacy_fee, r.estimated_total], ["nda", "0.00", "0.00"]);
});
