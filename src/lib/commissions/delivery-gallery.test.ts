import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { deliveryGalleryItem, mayShowInGallery, orderSummary, pickDeliveryImage } from "./delivery-gallery";

const req = {
  ref: 1042,
  service_title: "DnD Character Illustrations - TTRPG",
  package_name: "Half Body",
  extra_characters: 1,
  background_name: "Simple",
  delivered_at: "2026-11-21T10:00:00Z",
};

test("only an explicit yes puts the work in the gallery", () => {
  assert.equal(mayShowInGallery("public"), true);
  assert.equal(mayShowInGallery("final_only"), true);
  assert.equal(mayShowInGallery("nda"), false);
  assert.equal(mayShowInGallery(null), false);
  assert.equal(mayShowInGallery(undefined), false);
});

test("picks the first still image, skipping source files and archives", () => {
  const base = "u1/deliveries/r1/";
  assert.equal(
    pickDeliveryImage([`${base}1-a-final.psd`, `${base}2-b-final.zip`, `${base}3-c-Final Art.PNG`, `${base}4-d-alt.jpg`]),
    `${base}3-c-Final Art.PNG`,
  );
  assert.equal(pickDeliveryImage([`${base}1-a-emote.gif`, `${base}2-b-clip.mp4`]), null);
  assert.equal(pickDeliveryImage([]), null);
});

test("summary names package, characters and background, never price or client", () => {
  assert.equal(orderSummary(req), "Half Body, 2 characters, simple background");
  assert.equal(orderSummary({ ...req, extra_characters: 0, background_name: "No background" }), "Half Body");
  assert.equal(orderSummary({ ...req, extra_characters: 0, background_name: null }), "Half Body");
});

test("gallery item text and a descriptive storage name", () => {
  const item = deliveryGalleryItem(req);
  assert.equal(item.title, "Half Body — DnD Character Illustrations - TTRPG");
  assert.equal(
    item.caption,
    "Client commission: Half Body, 2 characters, simple background. Delivered November 2026. Hand-drawn by M.J. Fird.",
  );
  assert.equal(item.fileName, "art/dnd-character-illustrations-ttrpg-half-body-commission-1042.webp");
});

const migration = readFileSync(new URL("../../../supabase/migrations/0055_gallery_from_deliveries.sql", import.meta.url), "utf8");

test("migration: one gallery item per order, kept when the order is deleted", async () => {
  const pg = new PGlite();
  await pg.exec(`
    create table public.commission_requests (id uuid primary key);
    create table public.gallery_items (id uuid primary key default gen_random_uuid(), image_url text not null);
    insert into public.commission_requests values ('11111111-1111-4111-8111-111111111111');
  `);
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(`insert into public.gallery_items (image_url, request_id) values ('a', '11111111-1111-4111-8111-111111111111')`);
  await assert.rejects(pg.exec(`insert into public.gallery_items (image_url, request_id) values ('b', '11111111-1111-4111-8111-111111111111')`));
  await pg.exec(`delete from public.commission_requests`);
  const { rows } = await pg.query<{ request_id: string | null }>("select request_id from public.gallery_items");
  assert.deepEqual(rows, [{ request_id: null }]);
});
