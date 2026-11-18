import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import type { DiscordConfig } from "./config";
import type { FetchLike } from "./api";
import { COMMANDS, readApplicationId, registerGuildCommands } from "./commands";
import { handleInteraction, readPublicKey, verifyDiscordRequest, type Interaction } from "./interactions";
import { syncAllDiscordLinks } from "./sync-all";

const GUILD = "111111111111111111";
const LINKED = "222222222222222222";
const CLIENT_ROLE = "333333333333333333";
const USER = "444444444444444444";
const APP = "555555555555555555";
const SITE = "https://mjfird.com";

const config: DiscordConfig = {
  botToken: "bot-token",
  guildId: GUILD,
  linkedRoleId: LINKED,
  clientRoleId: CLIENT_ROLE,
  clientDiscountPercent: 10,
  inviteUrl: null,
};

// --- signature -------------------------------------------------------------

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return { publicHex: Buffer.from(raw).toString("hex"), privateKey };
}

test("verify: accepts Discord's signature over timestamp + body, rejects anything else", async () => {
  const { publicHex, privateKey } = keyPair();
  const body = JSON.stringify({ type: 1 });
  const ts = "1763440000";
  const sig = sign(null, Buffer.from(ts + body), privateKey).toString("hex");

  assert.equal(await verifyDiscordRequest(publicHex, sig, ts, body, 1763440010), true);
  assert.equal(await verifyDiscordRequest(publicHex, sig, ts, body + " ", 1763440010), false, "tampered body");
  assert.equal(await verifyDiscordRequest(publicHex, sig, "1763440001", body, 1763440010), false, "other timestamp");
  assert.equal(await verifyDiscordRequest(publicHex, sig, ts, body, 1763440000 + 3600), false, "too old");
  assert.equal(await verifyDiscordRequest(publicHex, null, ts, body), false);
  assert.equal(await verifyDiscordRequest(publicHex, "zz", ts, body), false);
  assert.equal(await verifyDiscordRequest(keyPair().publicHex, sig, ts, body, 1763440010), false, "other key");
});

test("config: public key and application id must look right", () => {
  assert.equal(readPublicKey({}), null);
  assert.equal(readPublicKey({ DISCORD_PUBLIC_KEY: "abc" }), null);
  assert.equal(readPublicKey({ DISCORD_PUBLIC_KEY: ` ${"AB".repeat(32)} ` }), "ab".repeat(32));
  assert.equal(readApplicationId({ DISCORD_APPLICATION_ID: APP }), APP);
  assert.equal(readApplicationId({ DISCORD_APPLICATION_ID: "nope" }), null);
});

// --- interactions ------------------------------------------------------------

function fakeDb(link: { client_id: string } | null, opts: { failLookup?: boolean } = {}) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    from() {
      return {
        select() {
          return {
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve(opts.failLookup ? { data: null, error: { message: "down" } } : { data: link, error: null }),
            }),
          };
        },
        update(row: Record<string, unknown>) {
          updates.push(row);
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    },
  };
  return { db: db as never, updates };
}

function command(name: string, roles: string[] = [], guild = GUILD): Interaction {
  return { type: 2, guild_id: guild, data: { name }, member: { roles, user: { id: USER } } };
}

type Message = { type: number; data: { content: string; flags: number; components?: { components: { url: string; label: string }[] }[] } };

test("interactions: PING gets PONG", async () => {
  assert.deepEqual(await handleInteraction({ type: 1 }, { config: null, db: null, siteUrl: SITE }), { type: 1 });
});

test("/link: unlinked member gets a private button to their profile", async () => {
  const { db } = fakeDb(null);
  const res = (await handleInteraction(command("link"), { config, db, siteUrl: SITE })) as Message;
  assert.equal(res.type, 4);
  assert.equal(res.data.flags, 64, "only the member sees it");
  assert.match(res.data.content, /10% off/);
  assert.equal(res.data.components?.[0].components[0].url, `${SITE}/account/profile`);
});

test("/link: already linked says so", async () => {
  const { db } = fakeDb({ client_id: "c1" });
  const res = (await handleInteraction(command("link"), { config, db, siteUrl: SITE })) as Message;
  assert.match(res.data.content, /already linked/);
});

test("/status: past client sees the discount, the stored check is refreshed, no role call needed", async () => {
  const { db, updates } = fakeDb({ client_id: "c1" });
  const added: string[] = [];
  const now = new Date("2026-11-18T03:00:00Z");
  const res = (await handleInteraction(command("status", [LINKED, CLIENT_ROLE]), {
    config,
    db,
    siteUrl: SITE,
    now: () => now,
    addLinkedRole: (id) => added.push(id),
  })) as Message;
  assert.match(res.data.content, /10% off/);
  assert.deepEqual(updates[0], { in_guild: true, past_client: true, discount_percent: 10, synced_at: now.toISOString() });
  assert.deepEqual(added, []);
});

test("/status: linked member missing Web Linked gets it in the background; no discount without the role", async () => {
  const { db, updates } = fakeDb({ client_id: "c1" });
  const added: string[] = [];
  const res = (await handleInteraction(command("status", []), { config, db, siteUrl: SITE, addLinkedRole: (id) => added.push(id) })) as Message;
  assert.deepEqual(added, [USER]);
  assert.match(res.data.content, /No discount/);
  assert.equal(updates[0].discount_percent, 0);
});

test("/status: not linked shows the connect button and writes nothing", async () => {
  const { db, updates } = fakeDb(null);
  const res = (await handleInteraction(command("status"), { config, db, siteUrl: SITE })) as Message;
  assert.match(res.data.content, /isn't linked/);
  assert.equal(updates.length, 0);
});

test("interactions: wrong server, not configured, unknown command and DB errors answer politely", async () => {
  const { db } = fakeDb(null);
  const other = (await handleInteraction(command("status", [], "999999999999999999"), { config, db, siteUrl: SITE })) as Message;
  assert.match(other.data.content, /Fird Studio server/);
  const off = (await handleInteraction(command("status"), { config: null, db, siteUrl: SITE })) as Message;
  assert.match(off.data.content, /isn't switched on/);
  const unknown = (await handleInteraction(command("hack"), { config, db, siteUrl: SITE })) as Message;
  assert.match(unknown.data.content, /Unknown command/);
  const broken = fakeDb(null, { failLookup: true });
  const err = (await handleInteraction(command("status"), { config, db: broken.db, siteUrl: SITE })) as Message;
  assert.match(err.data.content, /went wrong/);
});

// --- command registration -----------------------------------------------------

test("commands: bulk-overwrites the guild's commands with the bot token", async () => {
  const calls: { url: string; method?: string; body?: string; auth: string | null }[] = [];
  const ok: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method, body: init?.body as string, auth: new Headers(init?.headers).get("authorization") });
    return new Response("[]", { status: 200 });
  };
  await registerGuildCommands(config, APP, ok);
  assert.equal(calls[0].url, `https://discord.com/api/v10/applications/${APP}/guilds/${GUILD}/commands`);
  assert.equal(calls[0].method, "PUT");
  assert.equal(calls[0].auth, "Bot bot-token");
  assert.deepEqual(JSON.parse(calls[0].body ?? "[]").map((c: { name: string }) => c.name), COMMANDS.map((c) => c.name));

  const denied: FetchLike = async () => new Response(null, { status: 403 });
  await assert.rejects(registerGuildCommands(config, APP, denied), /HTTP 403/);
});

// --- daily sync -----------------------------------------------------------------

function listDb(rows: { client_id: string; discord_user_id: string; discord_username: string }[]) {
  const upserts: Record<string, unknown>[] = [];
  const db = {
    from() {
      return {
        select() {
          return { order: () => ({ limit: () => Promise.resolve({ data: rows, error: null }) }) };
        },
        upsert(row: Record<string, unknown>) {
          upserts.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { db: db as never, upserts };
}

const memberUrl = (id: string) => `https://discord.com/api/v10/guilds/${GUILD}/members/${id}`;

test("sync-all: re-checks every link and gives Web Linked to members who joined later", async () => {
  const A = "600000000000000001";
  const B = "600000000000000002";
  const calls: string[] = [];
  const f: FetchLike = async (url, init) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url === memberUrl(A)) return new Response(JSON.stringify({ roles: [] }), { status: 200 });
    if (url === memberUrl(B)) return new Response(null, { status: 404 });
    if (url === `${memberUrl(A)}/roles/${LINKED}`) return new Response(null, { status: 204 });
    return new Response(null, { status: 500 });
  };
  const { db, upserts } = listDb([
    { client_id: "a", discord_user_id: A, discord_username: "a" },
    { client_id: "b", discord_user_id: B, discord_username: "b" },
  ]);
  const result = await syncAllDiscordLinks({ config, db, fetchImpl: f, pauseMs: 0 });
  assert.deepEqual(result, { ok: true, checked: 2, synced: 2, failed: 0, stoppedEarly: false });
  assert.ok(calls.includes(`PUT ${memberUrl(A)}/roles/${LINKED}`));
  assert.deepEqual(upserts.map((u) => u.in_guild), [true, false]);
});

test("sync-all: stops after three Discord failures in a row", async () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ client_id: `c${i}`, discord_user_id: `70000000000000000${i}`, discord_username: "" }));
  const { db } = listDb(rows);
  const down: FetchLike = async () => new Response(null, { status: 429 });
  const result = await syncAllDiscordLinks({ config, db, fetchImpl: down, pauseMs: 0 });
  assert.deepEqual(result, { ok: true, checked: 3, synced: 0, failed: 3, stoppedEarly: true });
  assert.deepEqual(await syncAllDiscordLinks({ config: null, db }), { ok: false, reason: "not_configured" });
});
