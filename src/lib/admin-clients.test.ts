import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  clientsToCsv,
  csvCell,
  parseFilter,
  parseSort,
  selectClients,
  summarizeClients,
  type ClientOrder,
  type ClientProfile,
} from "./admin/clients";

const profile = (id: string, over: Partial<ClientProfile> = {}): ClientProfile => ({
  id,
  display_name: `Client ${id}`,
  email: `${id}@example.com`,
  avatar_url: null,
  region: "",
  discord: "",
  x_handle: "",
  social_url: "",
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

let n = 0;
const order = (client_id: string, status: ClientOrder["status"], price: number | null, est: number, created_at: string): ClientOrder => ({
  id: `o${++n}`,
  client_id,
  status,
  final_price: price,
  estimated_total: String(est),
  created_at,
});

const profiles = [
  profile("ana", { created_at: "2026-03-01T00:00:00Z", region: "Jakarta", discord: "ana.draws" }),
  profile("ben", { created_at: "2026-02-01T00:00:00Z" }),
  profile("cyd", { created_at: "2026-04-01T00:00:00Z" }),
  profile("me", { created_at: "2025-01-01T00:00:00Z" }),
];
const orders = [
  order("ana", "completed", 120, 100, "2026-03-05T00:00:00Z"),
  order("ana", "in_progress", null, 80.5, "2026-05-01T00:00:00Z"),
  order("ana", "declined", null, 300, "2026-03-10T00:00:00Z"),
  order("ben", "awaiting_payment", 500, 450, "2026-06-01T00:00:00Z"),
];

test("only paid work counts toward spend, at the final price when set", () => {
  const list = summarizeClients(profiles, orders, ["me"]);
  const ana = list.find((c) => c.id === "ana")!;
  assert.deepEqual(
    { orders: ana.orders, paid: ana.paidOrders, spent: ana.spent, last: ana.lastOrderAt },
    { orders: 3, paid: 2, spent: 200.5, last: "2026-05-01T00:00:00Z" },
  );
  const ben = list.find((c) => c.id === "ben")!;
  assert.equal(ben.spent, 0, "awaiting payment isn't revenue yet");
  assert.equal(ben.orders, 1);
});

test("admin accounts are left out", () => {
  assert.deepEqual(
    summarizeClients(profiles, orders, ["me"]).map((c) => c.id).sort(),
    ["ana", "ben", "cyd"],
  );
});

test("filters, search and sort", () => {
  const list = summarizeClients(profiles, orders, ["me"]);
  const ids = (opts: Parameters<typeof selectClients>[1]) => selectClients(list, opts).map((c) => c.id);
  assert.deepEqual(ids({}), ["cyd", "ana", "ben"], "newest first by default");
  assert.deepEqual(ids({ filter: "never" }), ["cyd"]);
  assert.deepEqual(ids({ filter: "paid" }), ["ana"]);
  assert.deepEqual(ids({ filter: "ordered", sort: "recent" }), ["ben", "ana"]);
  assert.deepEqual(ids({ sort: "spent" }), ["ana", "ben", "cyd"]);
  assert.deepEqual(ids({ q: "@ANA.DRAWS" }), ["ana"], "matches Discord, ignores case and a leading @");
  assert.deepEqual(ids({ q: "jakarta" }), ["ana"]);
  assert.deepEqual(ids({ q: "nobody" }), []);
  assert.equal(parseFilter("bogus"), "all");
  assert.equal(parseSort(undefined), "newest");
});

test("CSV cells are quoted and can't run as spreadsheet formulas", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('Ana "Ink", Studio'), '"Ana ""Ink"", Studio"');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  assert.equal(csvCell("=HYPERLINK(\"http://evil\")"), '"\'=HYPERLINK(""http://evil"")"');
  assert.equal(csvCell("+1 555"), "'+1 555");
  assert.equal(csvCell("@sum"), "'@sum");
  assert.equal(csvCell(-5), "-5", "real numbers are left alone");
  assert.equal(csvCell(null), "");
});

test("CSV export has a header row, a BOM and one line per client", () => {
  const csv = clientsToCsv(selectClients(summarizeClients(profiles, orders, ["me"]), { sort: "spent" }));
  assert.ok(csv.startsWith("﻿Name,Email,Region"));
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 4);
  assert.equal(lines[1], "Client ana,ana@example.com,Jakarta,ana.draws,,,2026-03-01,3,2,200.50,2026-05-01");
});

test("migration 0050: admins can list every admin, clients still can't", async () => {
  const ADMIN = "55555555-5555-4555-8555-555555555555";
  const ASSISTANT = "66666666-6666-4666-8666-666666666666";
  const CLIENT = "22222222-2222-4222-8222-222222222222";
  const pg = new PGlite();
  await pg.exec(`
    create role authenticated;
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table admins (user_id uuid primary key);
    alter table admins enable row level security;
    alter table admins force row level security;
    create policy "admins read self" on admins for select using (user_id = auth.uid());
    create or replace function public.is_admin()
    returns boolean language sql stable security definer set search_path = public as $$
      select exists (select 1 from public.admins where user_id = auth.uid());
    $$;
    create table commission_requests (id uuid primary key, client_id uuid not null, created_at timestamptz not null default now());
    grant select on admins to authenticated;
    insert into admins values ('${ADMIN}'), ('${ASSISTANT}');
  `);
  const migration = readFileSync(new URL("../../supabase/migrations/0050_admin_clients.sql", import.meta.url), "utf8");
  await pg.exec(migration);
  await pg.exec(migration); // safe to re-apply

  async function visibleAs(uid: string) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '${uid}', false)`);
    await pg.exec("set role authenticated");
    try {
      return (await pg.query<{ user_id: string }>("select user_id from admins order by user_id")).rows.map((r) => r.user_id);
    } finally {
      await pg.exec("reset role");
    }
  }
  assert.deepEqual(await visibleAs(ADMIN), [ADMIN, ASSISTANT].sort());
  assert.deepEqual(await visibleAs(CLIENT), []);
});
