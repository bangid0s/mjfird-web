import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../supabase/migrations/0039_gallery_service_links.sql", import.meta.url), "utf8");

const SERVICE_A = "66666666-6666-4666-8666-666666666666";
const SERVICE_B = "77777777-7777-4777-8777-777777777777";
const REVIEW = "88888888-8888-4888-8888-888888888888";

async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type content_status as enum ('draft', 'scheduled', 'published');
    create role anon nologin;
    create role authenticated nologin;
    create table services (id uuid primary key, title text not null);
    create table testimonials (id uuid primary key, quote text not null, name text not null);
    create table gallery_items (
      id uuid primary key default gen_random_uuid(),
      image_url text not null,
      tags text[] not null default '{}',
      sort_order int not null default 0,
      status content_status not null default 'published'
    );
    insert into services values ('${SERVICE_A}', 'Character'), ('${SERVICE_B}', 'Brand');
    insert into testimonials values ('${REVIEW}', 'Lovely work, thank you!', 'Ana');
  `);
  await pg.exec(migration);
  return pg;
}

test("existing gallery rows get empty links and run twice without error", async () => {
  const pg = await createDb();
  await pg.exec(`insert into gallery_items (image_url) values ('a.png')`);
  await pg.exec(migration); // idempotent
  const { rows } = await pg.query<{ service_ids: string[]; client_name: string | null; testimonial_id: string | null }>(
    "select service_ids, client_name, testimonial_id from gallery_items",
  );
  assert.deepEqual(rows[0], { service_ids: [], client_name: null, testimonial_id: null });
});

test("images are found by the service they are a sample of", async () => {
  const pg = await createDb();
  await pg.exec(`
    insert into gallery_items (image_url, service_ids) values
      ('a.png', '{${SERVICE_A}}'),
      ('b.png', '{${SERVICE_A},${SERVICE_B}}'),
      ('c.png', '{}');
  `);
  const { rows } = await pg.query<{ image_url: string }>(
    `select image_url from gallery_items where service_ids @> array['${SERVICE_B}']::uuid[]`,
  );
  assert.deepEqual(rows.map((r) => r.image_url), ["b.png"]);
});

test("deleting a service removes it from its images, keeping the others", async () => {
  const pg = await createDb();
  await pg.exec(`insert into gallery_items (image_url, service_ids) values ('b.png', '{${SERVICE_A},${SERVICE_B}}')`);
  await pg.exec(`delete from services where id = '${SERVICE_A}'`);
  const { rows } = await pg.query<{ service_ids: string[] }>("select service_ids from gallery_items");
  assert.deepEqual(rows[0].service_ids, [SERVICE_B]);
});

test("deleting a review unlinks it but keeps the image", async () => {
  const pg = await createDb();
  await pg.exec(`insert into gallery_items (image_url, testimonial_id) values ('a.png', '${REVIEW}')`);
  await pg.exec(`delete from testimonials where id = '${REVIEW}'`);
  const { rows } = await pg.query<{ testimonial_id: string | null }>("select testimonial_id from gallery_items");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].testimonial_id, null);
});

test("a review link must point at a real review", async () => {
  const pg = await createDb();
  await assert.rejects(
    pg.exec(`insert into gallery_items (image_url, testimonial_id) values ('a.png', gen_random_uuid())`),
  );
});
