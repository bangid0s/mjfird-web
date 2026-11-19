import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../supabase/migrations/0049_quote_requests.sql", import.meta.url), "utf8");

const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const QUOTE_SERVICE = "66666666-6666-4666-8666-666666666666";
const PRICED_SERVICE = "77777777-7777-4777-8777-777777777777";
const CLOSED_SERVICE = "88888888-8888-4888-8888-888888888888";
const DRAFT_SERVICE = "99999999-9999-4999-8999-999999999999";

function rejects(code: string) {
  return (err: unknown) => err instanceof Error && err.message.includes(code);
}

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create schema if not exists auth;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table services (
      id uuid primary key,
      title text not null,
      slug text not null,
      status text not null default 'published',
      availability text not null default 'open',
      slots_total int,
      slots_taken int not null default 0,
      packages jsonb not null default '[]'::jsonb
    );
    create table commission_requests (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null,
      service_id uuid references services (id),
      service_title text not null,
      service_slug text not null,
      package_id text not null,
      package_name text not null,
      package_price numeric(10, 2) not null,
      estimated_total numeric(10, 2) not null,
      final_price numeric(10, 2),
      status commission_status not null default 'pending',
      waitlisted boolean not null default false,
      contact_name text not null,
      contact_email text not null,
      brief text not null,
      answers jsonb not null default '[]'::jsonb,
      reference_paths text[] not null default '{}'
    );
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`
    insert into auth.users values ('${CLIENT_ID}', 'client@example.com');
    insert into services (id, title, slug, packages) values
      ('${QUOTE_SERVICE}', 'Custom Illustration', 'custom-illustration', '[]'),
      ('${PRICED_SERVICE}', 'Character Art', 'character-art', '[{"id":"bust","name":"Bust","price":50}]');
    insert into services (id, title, slug, availability) values ('${CLOSED_SERVICE}', 'Closed', 'closed', 'closed');
    insert into services (id, title, slug, status) values ('${DRAFT_SERVICE}', 'Draft', 'draft', 'draft');
  `);

  async function as<T>(uid: string | null, fn: () => Promise<T>) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
    await pg.exec(`set role ${uid ? "authenticated" : "anon"}`);
    try {
      return await fn();
    } finally {
      await pg.exec("reset role");
    }
  }

  const submit = (service: string, opts: { brief?: string; refs?: string[] } = {}) =>
    pg.query<{ id: string }>("select public.submit_quote_request($1, $2, $3, $4, $5) as id", [
      service,
      "Rina",
      opts.brief ?? "A full-scene illustration of my band for an album cover.",
      JSON.stringify([]),
      opts.refs ?? [],
    ]);

  return { pg, as, submit };
}

test("a client can request a quote for a service with no packages", async () => {
  const { pg, as, submit } = await createDb();
  const res = await as(CLIENT_ID, () => submit(QUOTE_SERVICE, { refs: [`${CLIENT_ID}/refs/a.png`] }));
  const id = res.rows[0].id;
  const row = (
    await pg.query<{
      package_id: string;
      package_name: string;
      estimated_total: string;
      final_price: string | null;
      status: string;
      contact_email: string;
      service_slug: string;
    }>("select * from commission_requests where id = $1", [id])
  ).rows[0];
  assert.equal(row.package_id, "custom-quote");
  assert.equal(row.package_name, "Custom quote");
  assert.equal(Number(row.estimated_total), 0);
  assert.equal(row.final_price, null);
  assert.equal(row.status, "pending");
  assert.equal(row.contact_email, "client@example.com");
  assert.equal(row.service_slug, "custom-illustration");
});

test("quotes are refused for services that have packages, are closed, or unpublished", async () => {
  const { as, submit } = await createDb();
  await assert.rejects(as(CLIENT_ID, () => submit(PRICED_SERVICE)), rejects("quote_not_offered"));
  await assert.rejects(as(CLIENT_ID, () => submit(CLOSED_SERVICE)), rejects("service_closed"));
  await assert.rejects(as(CLIENT_ID, () => submit(DRAFT_SERVICE)), rejects("service_not_found"));
});

test("quotes need a signed-in client, a real brief and the client's own files", async () => {
  const { as, submit } = await createDb();
  await assert.rejects(as(null, () => submit(QUOTE_SERVICE)), (err: unknown) => err instanceof Error);
  await assert.rejects(as(CLIENT_ID, () => submit(QUOTE_SERVICE, { brief: "hi" })), rejects("invalid_brief"));
  await assert.rejects(
    as(CLIENT_ID, () => submit(QUOTE_SERVICE, { refs: ["someone-else/refs/a.png"] })),
    rejects("invalid_file"),
  );
});

test("a client can have at most five pending requests", async () => {
  const { as, submit } = await createDb();
  for (let i = 0; i < 5; i++) await as(CLIENT_ID, () => submit(QUOTE_SERVICE));
  await assert.rejects(as(CLIENT_ID, () => submit(QUOTE_SERVICE)), rejects("too_many_pending"));
});
