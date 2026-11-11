import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { clientProfileSchema, normalizeUrl, normalizeXHandle } from "./client/profile";

const base = { display_name: "Rina", region: "", discord: "", x_handle: "", social_url: "" };
const parse = (over: Partial<typeof base>) => clientProfileSchema.safeParse({ ...base, ...over });

test("X handles are stored bare, whatever the client pastes", () => {
  for (const raw of ["@mjfird", "mjfird", "x.com/mjfird", "https://twitter.com/mjfird?s=21", "https://www.x.com/mjfird/"]) {
    assert.equal(normalizeXHandle(raw), "mjfird", raw);
  }
  assert.equal(parse({ x_handle: "@this_handle_is_way_too_long" }).success, false);
});

test("the extra link gets https:// and must look like a real address", () => {
  assert.equal(normalizeUrl("instagram.com/rina"), "https://instagram.com/rina");
  assert.equal(normalizeUrl(" "), "");
  assert.equal(parse({ social_url: "instagram.com/rina" }).data?.social_url, "https://instagram.com/rina");
  assert.equal(parse({ social_url: "javascript:alert(1)" }).success, false);
  assert.equal(parse({ social_url: "not a link" }).success, false);
});

test("display name is required; Discord accepts current and legacy names", () => {
  assert.equal(parse({ display_name: "  " }).success, false);
  assert.equal(parse({ discord: "@rina.draws" }).data?.discord, "rina.draws");
  assert.equal(parse({ discord: "Rina#1234" }).success, true);
  assert.equal(parse({ discord: "no spaces please" }).success, false);
});

test("migration: clients can edit only their own editable fields", async () => {
  const pg = new PGlite();
  await pg.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create role authenticated nologin;
    create table client_profiles (
      id uuid primary key references auth.users (id) on delete cascade,
      display_name text not null default '', email text not null default '',
      avatar_url text, created_at timestamptz not null default now()
    );
    grant select, update on client_profiles to authenticated;
    insert into auth.users values ('22222222-2222-4222-8222-222222222222', 'rina@example.com');
    insert into client_profiles (id, display_name, email) values ('22222222-2222-4222-8222-222222222222', 'rina', 'rina@example.com');
  `);
  const migration = readFileSync(new URL("../../supabase/migrations/0038_client_profile_details.sql", import.meta.url), "utf8");
  await pg.exec(migration);
  await pg.exec(migration); // safe to re-run
  await pg.exec("set role authenticated");
  await pg.exec("update client_profiles set display_name = 'Rina', region = 'Indonesia', discord = 'rina', x_handle = 'rina', social_url = 'https://vgen.co/rina'");
  await assert.rejects(pg.exec("update client_profiles set email = 'other@example.com'"), /permission denied/);
  await assert.rejects(pg.exec("update client_profiles set social_url = 'javascript:alert(1)'"), /client_profiles_details_length/);
  const row = (await pg.query<{ region: string }>("select region from client_profiles")).rows[0];
  assert.equal(row.region, "Indonesia");
});
