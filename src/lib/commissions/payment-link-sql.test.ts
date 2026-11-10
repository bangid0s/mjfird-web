import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PaymentUrlError, normalizePaymentUrl } from "@/lib/commissions/payment-link";

const migration = readFileSync(new URL("../../../supabase/migrations/0032_commission_payment_url.sql", import.meta.url), "utf8");

const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_REQUEST = "33333333-3333-4333-8333-333333333333";

const samples = [
  "https://www.paypal.com/invoice/payerView/details/INV2-ABC?v=1",
  "https://paypal.me/MJFird",
  "https://www.paypal.me/studio",
  "https://paypal.com",
  "HTTPS://PayPal.com/Invoice",
  "  https://www.paypal.com:443/pay  ",
  "https://paypal.com/path?amount=1.00&currency=USD",
  "https://paypal.me/name#paid",
  "https://paypal.com/x?email=a@b.com",
  "",
  "   ",
  "http://paypal.com/invoice",
  "http://www.paypal.com/invoice",
  "//paypal.com/invoice",
  "javascript:alert(1)",
  "javascript:https://paypal.com",
  "data:text/html,https://paypal.com",
  "https://user@paypal.com/invoice",
  "https://user:pass@www.paypal.com/invoice",
  "https://paypal.com@evil.com/",
  "https://evilexamplepaypal.com/invoice",
  "https://paypal.com.evil.com/invoice",
  "https://www.paypal.com.evil.com/",
  "https://notpaypal.com/",
  "https://paypal.me.evil.com/name",
  "https://sandbox.paypal.com/invoice",
  "https://www.sandbox.paypal.com/invoice",
  "https://paypal.com:8080/invoice",
  "https://paypal.com:80/",
  "https://127.0.0.1/",
  "https://127.0.0.1:443/invoice",
  "https://8.8.8.8/",
  "https://2130706433/",
  "https://[::1]/",
  "https://[::1]:443/",
  "https://paypal.com.",
  "https://paypal.com./invoice",
  "ftp://paypal.com/invoice",
  "https://evil.com/paypal.com",
  "https://paypal.com\\@evil.com",
  "https://paypal.com/a b",
];

function rejects(err: unknown, code: string) {
  return err instanceof Error && err.message.includes(code);
}

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create table commission_requests (
      id uuid primary key,
      client_id uuid,
      status commission_status not null default 'pending',
      final_price numeric(10, 2),
      currency text not null default 'USD'
    );
    create table admins (
      user_id uuid primary key
    );
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create or replace function public.is_admin()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $$
      select exists (select 1 from public.admins where user_id = auth.uid());
    $$;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`
    alter table commission_requests enable row level security;
    alter table commission_requests force row level security;
    drop policy if exists "client read own requests" on commission_requests;
    create policy "client read own requests" on commission_requests
      for select using (client_id = auth.uid() or public.is_admin());
    drop policy if exists "admin all requests" on commission_requests;
    create policy "admin all requests" on commission_requests
      for all using (public.is_admin()) with check (public.is_admin());
    grant select, insert, update, delete on commission_requests to anon, authenticated;
    insert into admins (user_id) values ('${ADMIN_ID}');
    insert into commission_requests (id, client_id, status, final_price, currency) values
      ('${REQUEST_ID}', '${CLIENT_ID}', 'awaiting_payment', 80.00, 'USD'),
      ('${OTHER_REQUEST}', '${OTHER_ID}', 'awaiting_payment', 40.00, 'USD');
  `);

  async function asRole<T>(role: "anon" | "authenticated", uid: string | null, fn: () => Promise<T>) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
    await pg.exec(`set role ${role}`);
    try {
      return await fn();
    } finally {
      await pg.exec("reset role");
    }
  }

  async function read(id = REQUEST_ID) {
    const result = await pg.query<{ payment_url: string | null; payment_url_set_at: string | null; status: string; final_price: string | null }>(
      "select payment_url, payment_url_set_at::text, status, final_price::text from commission_requests where id = $1",
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new Error("missing request");
    return row;
  }

  return { pg, asRole, read };
}

test("0032 is additive", () => {
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\bdrop\s+column\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
  assert.match(migration, /revoke all on function public\.enforce_commission_payment_url\(\) from anon/i);
  assert.match(migration, /revoke all on function public\.enforce_commission_payment_url\(\) from authenticated/i);
});

test("SQL normalizer matches the TypeScript helper", async () => {
  const { pg } = await createDb();
  for (const input of samples) {
    let expected: string | null | undefined;
    try {
      expected = normalizePaymentUrl(input);
    } catch (err) {
      assert.ok(err instanceof PaymentUrlError, input);
      await assert.rejects(
        () => pg.query("select public.commission_payment_url_normalize($1)", [input]),
        (error: unknown) => rejects(error, "payment_url_invalid") || rejects(error, "payment_url_too_long"),
        input,
      );
      continue;
    }
    const row = await pg.query<{ commission_payment_url_normalize: string | null }>(
      "select public.commission_payment_url_normalize($1)",
      [input],
    );
    assert.equal(row.rows[0]?.commission_payment_url_normalize, expected, input);
  }
  const cleared = await pg.query<{ commission_payment_url_normalize: string | null }>(
    "select public.commission_payment_url_normalize($1)",
    [null],
  );
  assert.equal(cleared.rows[0]?.commission_payment_url_normalize, null);

  const base = "https://paypal.com/";
  const ok = base + "a".repeat(2000 - base.length);
  const stored = await pg.query<{ commission_payment_url_normalize: string }>(
    "select public.commission_payment_url_normalize($1)",
    [ok],
  );
  assert.equal(stored.rows[0]?.commission_payment_url_normalize, ok);
  await assert.rejects(
    () => pg.query("select public.commission_payment_url_normalize($1)", [ok + "a"]),
    (error: unknown) => rejects(error, "payment_url_too_long"),
  );
});

test("admin can set and clear a link; a client cannot write", async () => {
  const { pg, asRole, read } = await createDb();

  const anonRpc = await pg.query<{ allowed: boolean }>(
    "select has_function_privilege('anon', 'public.set_commission_payment_url(uuid, text)', 'execute') as allowed",
  );
  const userRpc = await pg.query<{ allowed: boolean }>(
    "select has_function_privilege('authenticated', 'public.set_commission_payment_url(uuid, text)', 'execute') as allowed",
  );
  const anonTrigger = await pg.query<{ allowed: boolean }>(
    "select has_function_privilege('anon', 'public.enforce_commission_payment_url()', 'execute') as allowed",
  );
  const userTrigger = await pg.query<{ allowed: boolean }>(
    "select has_function_privilege('authenticated', 'public.enforce_commission_payment_url()', 'execute') as allowed",
  );
  assert.equal(anonRpc.rows[0]?.allowed, false);
  assert.equal(userRpc.rows[0]?.allowed, true);
  assert.equal(anonTrigger.rows[0]?.allowed, false);
  assert.equal(userTrigger.rows[0]?.allowed, false);

  await asRole("authenticated", CLIENT_ID, async () => {
    const own = await pg.query<{ payment_url: string | null }>(
      "select payment_url from commission_requests where id = $1",
      [REQUEST_ID],
    );
    assert.equal(own.rows.length, 1);
    const other = await pg.query("select id from commission_requests where id = $1", [OTHER_REQUEST]);
    assert.equal(other.rows.length, 0);
    await pg.query("update commission_requests set payment_url = 'https://paypal.com/hack', final_price = 1 where id = $1", [REQUEST_ID]);
    await assert.rejects(
      () => pg.query("select public.set_commission_payment_url($1, 'https://paypal.com/hack')", [REQUEST_ID]),
      (error: unknown) => rejects(error, "not_admin"),
    );
  });
  assert.equal((await read()).payment_url, null);
  assert.equal((await read()).final_price, "80.00");

  await asRole("authenticated", ADMIN_ID, async () => {
    await pg.query("select public.set_commission_payment_url($1, $2)", [REQUEST_ID, "https://www.paypal.com/invoice/INV2-1"]);
  });
  const set = await read();
  assert.equal(set.payment_url, "https://www.paypal.com/invoice/INV2-1");
  assert.ok(set.payment_url_set_at);

  await asRole("authenticated", CLIENT_ID, async () => {
    const own = await pg.query<{ payment_url: string | null; final_price: string }>(
      "select payment_url, final_price::text from commission_requests where id = $1",
      [REQUEST_ID],
    );
    assert.equal(own.rows[0]?.payment_url, "https://www.paypal.com/invoice/INV2-1");
    assert.equal(own.rows[0]?.final_price, "80.00");
  });

  const stamped = (await read()).payment_url_set_at;
  await asRole("authenticated", ADMIN_ID, async () => {
    await pg.query("select public.set_commission_payment_url($1, $2)", [REQUEST_ID, "HTTPS://www.paypal.com/invoice/INV2-1"]);
  });
  assert.equal((await read()).payment_url_set_at, stamped);

  await asRole("authenticated", ADMIN_ID, async () => {
    await assert.rejects(
      () => pg.query("select public.set_commission_payment_url($1, 'http://paypal.com/invoice')", [REQUEST_ID]),
      (error: unknown) => rejects(error, "payment_url_invalid"),
    );
  });
  assert.equal((await read()).payment_url, "https://www.paypal.com/invoice/INV2-1");

  await asRole("authenticated", ADMIN_ID, async () => {
    await pg.query("select public.set_commission_payment_url($1, '  ')", [REQUEST_ID]);
  });
  const cleared = await read();
  assert.equal(cleared.payment_url, null);
  assert.equal(cleared.payment_url_set_at, null);

  await asRole("authenticated", CLIENT_ID, async () => {
    await assert.rejects(
      () =>
        pg.query(
          "insert into commission_requests (id, client_id, status, final_price) values ($1, $2, 'pending', 1)",
          ["77777777-7777-4777-8777-777777777777", CLIENT_ID],
        ),
      (error: unknown) => error instanceof Error && error.message.includes("row-level security"),
    );
  });
});

test("the trigger blocks invalid direct writes and late edits", async () => {
  const { pg, asRole, read } = await createDb();
  await pg.query("update commission_requests set payment_url = 'https://PayPal.me/studio', final_price = 90, status = 'awaiting_payment' where id = $1", [
    REQUEST_ID,
  ]);
  const saved = await read();
  assert.equal(saved.payment_url, "https://paypal.me/studio");
  assert.equal(saved.final_price, "90.00");
  assert.equal(saved.status, "awaiting_payment");

  await asRole("authenticated", ADMIN_ID, async () => {
    await pg.query("update commission_requests set payment_url = 'https://www.paypal.com/from-admin' where id = $1", [REQUEST_ID]);
    await assert.rejects(
      () => pg.query("update commission_requests set payment_url = 'https://evilexamplepaypal.com/x' where id = $1", [REQUEST_ID]),
      (error: unknown) => rejects(error, "payment_url_invalid"),
    );
  });
  assert.equal((await read()).payment_url, "https://www.paypal.com/from-admin");

  const pendingId = "88888888-8888-4888-8888-888888888888";
  await pg.query("insert into commission_requests (id, client_id, status, final_price) values ($1, $2, 'pending', 15)", [pendingId, CLIENT_ID]);
  await asRole("authenticated", ADMIN_ID, async () => {
    await pg.query("select public.set_commission_payment_url($1, 'https://paypal.me/pending')", [pendingId]);
  });
  assert.equal((await read(pendingId)).status, "pending");
  assert.equal((await read(pendingId)).payment_url, "https://paypal.me/pending");
  assert.equal((await read(pendingId)).final_price, "15.00");

  const bad = [
    "http://paypal.com/x",
    "https://evilexamplepaypal.com/x",
    "https://paypal.com.evil.com/x",
    "https://user@paypal.com/x",
    "javascript:alert(1)",
    "https://paypal.com:8443/x",
    "https://127.0.0.1/x",
    "https://[::1]/x",
  ];
  for (const url of bad) {
    await assert.rejects(
      () => pg.query("update commission_requests set payment_url = $2 where id = $1", [REQUEST_ID, url]),
      (error: unknown) => rejects(error, "payment_url_invalid"),
      url,
    );
    assert.equal((await read()).payment_url, "https://www.paypal.com/from-admin");
  }

  await pg.query("update commission_requests set status = 'in_progress' where id = $1", [REQUEST_ID]);
  assert.equal((await read()).status, "in_progress");
  assert.equal((await read()).payment_url, "https://www.paypal.com/from-admin");
  await asRole("authenticated", ADMIN_ID, async () => {
    await assert.rejects(
      () => pg.query("select public.set_commission_payment_url($1, 'https://paypal.com/later')", [REQUEST_ID]),
      (error: unknown) => rejects(error, "payment_url_status"),
    );
  });
  await assert.rejects(
    () => pg.query("update commission_requests set payment_url = 'https://paypal.com/later' where id = $1", [REQUEST_ID]),
    (error: unknown) => rejects(error, "payment_url_status"),
  );
  await assert.rejects(
    () => pg.query("update commission_requests set payment_url = null where id = $1", [REQUEST_ID]),
    (error: unknown) => rejects(error, "payment_url_status"),
  );
  assert.equal((await read()).payment_url, "https://www.paypal.com/from-admin");

  await assert.rejects(
    () =>
      pg.query(
        "insert into commission_requests (id, client_id, status, payment_url) values ($1, $2, 'pending', 'http://paypal.com/x')",
        ["66666666-6666-4666-8666-666666666666", CLIENT_ID],
      ),
    (error: unknown) => rejects(error, "payment_url_invalid"),
  );
});
