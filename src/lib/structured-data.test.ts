import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumbSchema, parseLocation, personRef, personSchema, serviceSchema, PERSON_ID } from "./structured-data";

test("location text becomes locality + country", () => {
  assert.deepEqual(parseLocation("Semarang, Indonesia - Working remotely"), {
    addressLocality: "Semarang",
    addressCountry: "Indonesia",
  });
  assert.deepEqual(parseLocation("Indonesia"), { addressCountry: "Indonesia" });
  assert.deepEqual(parseLocation(""), {});
});

test("person keeps only what the site states, with one stable @id", () => {
  const p = personSchema({
    name: "M.J. Fird",
    tagline: "Illustrator · Graphic Designer",
    avatarUrl: null,
    socials: [{ url: "https://www.behance.net/FiRD" }, { url: "discord-handle" }],
    location: "Semarang, Indonesia - Working remotely",
  });
  assert.equal(p["@id"], PERSON_ID);
  assert.equal(p["@id"], personRef["@id"]);
  assert.deepEqual(p.sameAs, ["https://www.behance.net/FiRD"]);
  assert.deepEqual(p.address, { "@type": "PostalAddress", addressLocality: "Semarang", addressCountry: "Indonesia" });
  assert.equal("image" in p, false);
  assert.equal("jobTitle" in p, false);
});

test("service lists one offer per paid package and points at the person", () => {
  const s = serviceSchema({
    slug: "dnd-character",
    title: "DnD Character Illustrations",
    description: "",
    packages: [
      { name: "Bust", price: 35 },
      { name: "Full Body", price: 70 },
      { name: "Quote", price: 0 },
    ],
  });
  assert.equal(s.provider["@id"], PERSON_ID);
  assert.equal(s.offers?.lowPrice, 35);
  assert.equal(s.offers?.highPrice, 70);
  assert.deepEqual(s.offers?.offers.map((o) => o.name), ["Bust", "Full Body"]);
  assert.equal("description" in s, false);
});

test("breadcrumbs number from 1 and use absolute URLs", () => {
  const b = breadcrumbSchema([{ name: "Services", path: "/services" }, { name: "DnD", path: "/services/dnd" }]);
  assert.equal(b.itemListElement[1].position, 2);
  assert.match(b.itemListElement[1].item, /^https:\/\/.+\/services\/dnd$/);
});
