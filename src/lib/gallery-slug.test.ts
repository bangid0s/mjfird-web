import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { slugifyGallery, uniqueGallerySlug, GALLERY_SLUG_RE } from "./gallery-slug";

test("slugifies titles the way the migration does", () => {
  assert.equal(slugifyGallery("DnD Party’s Poster Campaign "), "dnd-party-s-poster-campaign");
  assert.equal(slugifyGallery("Pokémon & Trainer"), "pokemon-trainer");
  assert.equal(slugifyGallery("!!!"), "");
  assert.ok(GALLERY_SLUG_RE.test(slugifyGallery("Orc Bard — Full Body")));
});

test("picks the next free number on a clash", () => {
  assert.equal(uniqueGallerySlug("Kori", []), "kori");
  assert.equal(uniqueGallerySlug("Kori", ["kori", "kori-2"]), "kori-3");
  assert.equal(uniqueGallerySlug("", ["artwork"]), "artwork-2");
});

const migration = readFileSync(new URL("../../supabase/migrations/0054_gallery_slugs.sql", import.meta.url), "utf8");

test("migration backfills unique slugs in gallery order and can run twice", async () => {
  const pg = new PGlite();
  await pg.exec(`
    create table public.gallery_items (
      id uuid primary key default gen_random_uuid(),
      image_url text not null, title text,
      sort_order int not null default 0, created_at timestamptz not null default now()
    );
    insert into public.gallery_items (image_url, title, sort_order) values
      ('a', 'Kori ', 0), ('b', 'kori', 1), ('c', null, 2), ('d', 'DnD Party’s Poster', 3);
  `);
  await pg.exec(migration);
  await pg.exec(migration);
  const { rows } = await pg.query<{ slug: string }>("select slug from public.gallery_items order by sort_order");
  assert.deepEqual(rows.map((r) => r.slug), ["kori", "kori-2", "artwork", "dnd-party-s-poster"]);
  await assert.rejects(pg.exec("update public.gallery_items set slug = 'kori' where image_url = 'c'"));
});
