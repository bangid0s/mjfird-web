import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../supabase/migrations/0033_verified_reviews.sql", import.meta.url), "utf8");

const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const SERVICE_ID = "66666666-6666-4666-8666-666666666666";
const DONE_REQUEST = "11111111-1111-4111-8111-111111111111";
const OPEN_REQUEST = "33333333-3333-4333-8333-333333333333";
const OTHER_REQUEST = "77777777-7777-4777-8777-777777777777";

function rejects(code: string) {
  return (err: unknown) => err instanceof Error && err.message.includes(code);
}

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type content_status as enum ('draft', 'scheduled', 'published');
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create table services (id uuid primary key, title text not null);
    create table commission_requests (
      id uuid primary key,
      client_id uuid not null,
      service_id uuid references services (id) on delete set null,
      service_title text not null,
      status commission_status not null default 'pending'
    );
    create table testimonials (
      id uuid primary key default gen_random_uuid(),
      quote text not null,
      name text not null,
      role text,
      avatar_url text,
      sort_order int not null default 0,
      status content_status not null default 'draft',
      created_at timestamptz not null default now()
    );
    create table admins (user_id uuid primary key);
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create or replace function public.is_admin()
    returns boolean language sql stable security definer set search_path = public as $$
      select exists (select 1 from public.admins where user_id = auth.uid());
    $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;

    alter table testimonials enable row level security;
    alter table testimonials force row level security;
    create policy "public read published testimonials" on testimonials for select using (status = 'published');
    create policy "admin all testimonials" on testimonials for all using (public.is_admin()) with check (public.is_admin());
    alter table commission_requests enable row level security;
    alter table commission_requests force row level security;
    create policy "client read own requests" on commission_requests
      for select using (client_id = auth.uid() or public.is_admin());
    grant select, insert, update, delete on testimonials, commission_requests, services to anon, authenticated;
  `);
  // Running it twice proves it is safe to re-apply.
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`
    insert into admins values ('${ADMIN_ID}');
    insert into services values ('${SERVICE_ID}', 'Character Illustration');
    insert into commission_requests values
      ('${DONE_REQUEST}', '${CLIENT_ID}', '${SERVICE_ID}', 'Character Illustration', 'completed'),
      ('${OPEN_REQUEST}', '${CLIENT_ID}', '${SERVICE_ID}', 'Character Illustration', 'in_progress'),
      ('${OTHER_REQUEST}', '${OTHER_ID}', '${SERVICE_ID}', 'Character Illustration', 'completed');
  `);

  async function as<T>(role: "anon" | "authenticated", uid: string | null, fn: () => Promise<T>) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
    await pg.exec(`set role ${role}`);
    try {
      return await fn();
    } finally {
      await pg.exec("reset role");
    }
  }

  const submit = (request: string, rating: number, quote: string, isPublic = true) =>
    pg.query<{ id: string }>("select public.submit_commission_review($1, $2, $3, $4, $5, $6) as id", [
      request,
      rating,
      quote,
      "Rina",
      "Art Director, Studio K",
      isPublic,
    ]);

  async function review(request = DONE_REQUEST) {
    const res = await pg.query<{
      id: string;
      quote: string;
      rating: number;
      status: string;
      public_consent: boolean;
      service_id: string | null;
      service_title: string | null;
    }>("select id, quote, rating, status::text, public_consent, service_id, service_title from testimonials where request_id = $1", [request]);
    return res.rows[0];
  }

  return { pg, as, submit, review };
}

const GOOD = "Clear process, fast sketches and the final piece was better than I imagined.";

test("0033 is additive", () => {
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\bdrop\s+column\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
});

test("client reviews their own completed request as a draft", async () => {
  const { as, submit, review } = await createDb();
  await as("authenticated", CLIENT_ID, () => submit(DONE_REQUEST, 5, GOOD));
  const row = await review();
  assert.ok(row);
  assert.equal(row.status, "draft");
  assert.equal(row.rating, 5);
  assert.equal(row.public_consent, true);
  assert.equal(row.service_id, SERVICE_ID);
  assert.equal(row.service_title, "Character Illustration");
});

test("only the owner, only when completed, only valid input", async () => {
  const { pg, as, submit } = await createDb();
  await assert.rejects(() => as("authenticated", CLIENT_ID, () => submit(OPEN_REQUEST, 5, GOOD)), rejects("review_not_open"));
  await assert.rejects(() => as("authenticated", CLIENT_ID, () => submit(OTHER_REQUEST, 5, GOOD)), rejects("request_not_found"));
  await assert.rejects(() => as("authenticated", CLIENT_ID, () => submit(DONE_REQUEST, 6, GOOD)), rejects("invalid_rating"));
  await assert.rejects(() => as("authenticated", CLIENT_ID, () => submit(DONE_REQUEST, 4, "short")), rejects("invalid_review"));
  await assert.rejects(() => as("authenticated", null, () => submit(DONE_REQUEST, 5, GOOD)), rejects("not_signed_in"));
  const anon = await pg.query<{ allowed: boolean }>(
    "select has_function_privilege('anon', 'public.submit_commission_review(uuid, int, text, text, text, boolean)', 'execute') as allowed",
  );
  assert.equal(anon.rows[0]?.allowed, false);
});

test("editing a published review sends it back for approval", async () => {
  const { pg, as, submit, review } = await createDb();
  await as("authenticated", CLIENT_ID, () => submit(DONE_REQUEST, 5, GOOD));
  const first = await review();
  await as("authenticated", ADMIN_ID, () => pg.query("update testimonials set status = 'published' where id = $1", [first!.id]));
  assert.equal((await review())?.status, "published");

  await as("authenticated", CLIENT_ID, () => submit(DONE_REQUEST, 4, GOOD + " Updated."));
  const edited = await review();
  assert.equal(edited?.id, first?.id, "same row, not a second review");
  assert.equal(edited?.status, "draft");
  assert.equal(edited?.rating, 4);
});

test("admin can't rewrite a verified review or publish a private one", async () => {
  const { pg, as, submit, review } = await createDb();
  await as("authenticated", CLIENT_ID, () => submit(DONE_REQUEST, 3, GOOD, false));
  const row = await review();

  await as("authenticated", ADMIN_ID, () =>
    pg.query("update testimonials set quote = 'Best artist ever', rating = 5, public_consent = true, name = 'R.' where id = $1", [row!.id]),
  );
  const after = await review();
  assert.equal(after?.quote, GOOD);
  assert.equal(after?.rating, 3);
  assert.equal(after?.public_consent, false);

  await assert.rejects(
    () => as("authenticated", ADMIN_ID, () => pg.query("update testimonials set status = 'published' where id = $1", [row!.id])),
    rejects("review_private"),
  );
});

test("verified reviews can't be faked through the API", async () => {
  const { pg, as } = await createDb();
  await assert.rejects(
    () =>
      as("authenticated", ADMIN_ID, () =>
        pg.query("insert into testimonials (quote, name, request_id, rating, public_consent, status) values ($1, 'X', $2, 5, true, 'published')", [
          GOOD,
          OTHER_REQUEST,
        ]),
      ),
    rejects("verified_review_rpc_only"),
  );
  // Re-linking a hand-written testimonial to a request is ignored.
  await as("authenticated", ADMIN_ID, () => pg.query("insert into testimonials (quote, name, status) values ('Manual quote', 'M', 'published')"));
  await as("authenticated", ADMIN_ID, () => pg.query("update testimonials set request_id = $1 where name = 'M'", [OTHER_REQUEST]));
  const res = await pg.query<{ request_id: string | null }>("select request_id from testimonials where name = 'M'");
  assert.equal(res.rows[0]?.request_id, null);
});

test("clients see their own review; strangers only see published ones", async () => {
  const { pg, as, submit } = await createDb();
  await as("authenticated", CLIENT_ID, () => submit(DONE_REQUEST, 5, GOOD));
  const own = await as("authenticated", CLIENT_ID, () => pg.query("select id from testimonials"));
  const other = await as("authenticated", OTHER_ID, () => pg.query("select id from testimonials"));
  const anon = await as("anon", null, () => pg.query("select id from testimonials"));
  assert.equal(own.rows.length, 1);
  assert.equal(other.rows.length, 0);
  assert.equal(anon.rows.length, 0);
});
