import assert from "node:assert/strict";
import test from "node:test";
import { parseDiscountPercent, readDiscordConfig, type DiscordConfig } from "./config";
import { addMemberRole, getGuildMember, removeMemberRole, DiscordApiError, type FetchLike } from "./api";
import { activeDiscountPercent, discordIdentityOf, discountOn, perksFor } from "./perks";
import { forgetDiscordLink, refreshDiscountFor, syncDiscordLink } from "./sync";

const GUILD = "111111111111111111";
const LINKED = "222222222222222222";
const CLIENT_ROLE = "333333333333333333";
const USER = "444444444444444444";

const config: DiscordConfig = {
  botToken: "bot-token",
  guildId: GUILD,
  linkedRoleId: LINKED,
  clientRoleId: CLIENT_ROLE,
  clientDiscountPercent: 10,
  inviteUrl: "https://discord.gg/abc",
};

type Call = { url: string; method: string; auth: string | null };

function fakeFetch(routes: Record<string, { status: number; body?: unknown }>) {
  const calls: Call[] = [];
  const impl: FetchLike = async (url, init) => {
    const method = init?.method ?? "GET";
    const auth = new Headers(init?.headers).get("authorization");
    calls.push({ url, method, auth });
    const hit = routes[`${method} ${url}`] ?? { status: 500 };
    return new Response(hit.body === undefined ? null : JSON.stringify(hit.body), { status: hit.status });
  };
  return { impl, calls };
}

const memberUrl = `https://discord.com/api/v10/guilds/${GUILD}/members/${USER}`;

test("config: off unless bot token, guild and linked role are set", () => {
  assert.equal(readDiscordConfig({}), null);
  assert.equal(readDiscordConfig({ DISCORD_BOT_TOKEN: "x", DISCORD_GUILD_ID: GUILD }), null);
  assert.equal(readDiscordConfig({ DISCORD_BOT_TOKEN: "x", DISCORD_GUILD_ID: "not-an-id", DISCORD_LINKED_ROLE_ID: LINKED }), null);
  const c = readDiscordConfig({
    DISCORD_BOT_TOKEN: " x ",
    DISCORD_GUILD_ID: GUILD,
    DISCORD_LINKED_ROLE_ID: LINKED,
    DISCORD_CLIENT_ROLE_ID: CLIENT_ROLE,
    DISCORD_INVITE_URL: "https://discord.gg/fird",
  });
  assert.deepEqual(c, { ...config, botToken: "x", inviteUrl: "https://discord.gg/fird" });
});

test("config: invite must be an https Discord link; percent defaults to 10 and is clamped", () => {
  const base = { DISCORD_BOT_TOKEN: "x", DISCORD_GUILD_ID: GUILD, DISCORD_LINKED_ROLE_ID: LINKED };
  assert.equal(readDiscordConfig({ ...base, DISCORD_INVITE_URL: "https://evil.example/discord.gg" })?.inviteUrl, null);
  assert.equal(readDiscordConfig({ ...base, DISCORD_INVITE_URL: "http://discord.gg/x" })?.inviteUrl, null);
  assert.equal(readDiscordConfig(base)?.clientRoleId, null);
  assert.equal(parseDiscountPercent(undefined), 10);
  assert.equal(parseDiscountPercent("15"), 15);
  assert.equal(parseDiscountPercent("90"), 50);
  assert.equal(parseDiscountPercent("-5"), 0);
  assert.equal(parseDiscountPercent("abc"), 10);
});

test("identity: only a Discord identity with a numeric id counts", () => {
  assert.equal(discordIdentityOf(null), null);
  assert.equal(discordIdentityOf({ identities: [{ provider: "google", id: USER }] }), null);
  assert.equal(discordIdentityOf({ identities: [{ provider: "discord", id: "abc", identity_data: {} }] }), null);
  assert.deepEqual(
    discordIdentityOf({
      identities: [{ provider: "discord", id: USER, identity_data: { provider_id: USER, full_name: "rina", custom_claims: { global_name: "Rina" } } }],
    }),
    { discordUserId: USER, username: "Rina" },
  );
});

test("perks: Past Client role gives the configured percent; no role, no discount", () => {
  assert.deepEqual(perksFor(null, config), { inGuild: false, hasLinkedRole: false, pastClient: false, discountPercent: 0 });
  assert.deepEqual(perksFor({ roles: [] }, config), { inGuild: true, hasLinkedRole: false, pastClient: false, discountPercent: 0 });
  assert.deepEqual(perksFor({ roles: [LINKED, CLIENT_ROLE] }, config), { inGuild: true, hasLinkedRole: true, pastClient: true, discountPercent: 10 });
  assert.equal(perksFor({ roles: [CLIENT_ROLE] }, { ...config, clientRoleId: null }).discountPercent, 0);
});

test("discount math matches the SQL trigger's rounding", () => {
  assert.deepEqual(discountOn(100, 10), { cut: 10, total: 90 });
  assert.deepEqual(discountOn(55.55, 10), { cut: 5.56, total: 49.99 });
  assert.deepEqual(discountOn(80, 0), { cut: 0, total: 80 });
  assert.deepEqual(discountOn(0, 10), { cut: 0, total: 0 });
});

test("stored link only counts while fresh, in the server and a past client", () => {
  const now = Date.parse("2026-11-17T12:00:00Z");
  const fresh = { in_guild: true, past_client: true, discount_percent: "10.00", synced_at: "2026-11-17T11:30:00Z" };
  assert.equal(activeDiscountPercent(fresh, now), 10);
  assert.equal(activeDiscountPercent({ ...fresh, synced_at: "2026-11-17T10:59:00Z" }, now), 0);
  assert.equal(activeDiscountPercent({ ...fresh, in_guild: false }, now), 0);
  assert.equal(activeDiscountPercent({ ...fresh, past_client: false }, now), 0);
  assert.equal(activeDiscountPercent(null, now), 0);
});

test("api: member lookup uses the bot token; 404 means not in the server", async () => {
  const ok = fakeFetch({ [`GET ${memberUrl}`]: { status: 200, body: { roles: [LINKED, 7] } } });
  assert.deepEqual(await getGuildMember(config, USER, ok.impl), { roles: [LINKED] });
  assert.equal(ok.calls[0].auth, "Bot bot-token");

  const missing = fakeFetch({ [`GET ${memberUrl}`]: { status: 404 } });
  assert.equal(await getGuildMember(config, USER, missing.impl), null);

  const down = fakeFetch({});
  await assert.rejects(getGuildMember(config, USER, down.impl), DiscordApiError);
  await assert.rejects(getGuildMember(config, "../../x", down.impl), DiscordApiError);
  assert.equal(down.calls.length, 1, "an invalid id never reaches Discord");
});

test("api: add/remove role; removing from someone who left is fine", async () => {
  const roleUrl = `${memberUrl}/roles/${LINKED}`;
  const f = fakeFetch({ [`PUT ${roleUrl}`]: { status: 204 }, [`DELETE ${roleUrl}`]: { status: 404 } });
  await addMemberRole(config, USER, LINKED, f.impl);
  await removeMemberRole(config, USER, LINKED, f.impl);
  assert.deepEqual(f.calls.map((c) => c.method), ["PUT", "DELETE"]);

  const forbidden = fakeFetch({ [`PUT ${roleUrl}`]: { status: 403 } });
  await assert.rejects(addMemberRole(config, USER, LINKED, forbidden.impl), /HTTP 403/);
});

function fakeDb(stored: Record<string, unknown> | null = null) {
  const writes: { op: string; row?: Record<string, unknown> }[] = [];
  const db = {
    from() {
      return {
        upsert(row: Record<string, unknown>) {
          writes.push({ op: "upsert", row });
          return Promise.resolve({ error: null });
        },
        delete() {
          return { eq: () => (writes.push({ op: "delete" }), Promise.resolve({ error: null })) };
        },
        select() {
          return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: stored }) }) };
        },
      };
    },
  };
  return { db: db as never, writes };
}

const identity = { discordUserId: USER, username: "Rina" };

test("sync: member without the linked role gets it, and the result is stored", async () => {
  const f = fakeFetch({
    [`GET ${memberUrl}`]: { status: 200, body: { roles: [CLIENT_ROLE] } },
    [`PUT ${memberUrl}/roles/${LINKED}`]: { status: 204 },
  });
  const { db, writes } = fakeDb();
  const result = await syncDiscordLink("client-1", identity, { config, db, fetchImpl: f.impl });
  assert.deepEqual(result, { ok: true, perks: { inGuild: true, hasLinkedRole: true, pastClient: true, discountPercent: 10 } });
  assert.equal(writes[0].op, "upsert");
  assert.equal(writes[0].row?.discount_percent, 10);
  assert.equal(writes[0].row?.discord_user_id, USER);
});

test("sync: not in the server stores no discount; Discord errors store nothing", async () => {
  const absent = fakeFetch({ [`GET ${memberUrl}`]: { status: 404 } });
  const a = fakeDb();
  const result = await syncDiscordLink("client-1", identity, { config, db: a.db, fetchImpl: absent.impl });
  assert.equal(result.ok && result.perks.inGuild, false);
  assert.equal(a.writes[0].row?.discount_percent, 0);
  assert.equal(absent.calls.length, 1, "no role call for non-members");

  const down = fakeFetch({});
  const d = fakeDb();
  assert.deepEqual(await syncDiscordLink("client-1", identity, { config, db: d.db, fetchImpl: down.impl }), { ok: false, reason: "discord_error" });
  assert.equal(d.writes.length, 0);

  assert.deepEqual(await syncDiscordLink("client-1", identity, { config: null, db: d.db }), { ok: false, reason: "not_configured" });
});

test("refreshDiscountFor: 0 without Discord; falls back to the stored fresh result when Discord is down", async () => {
  const user = { id: "client-1", identities: [{ provider: "discord", id: USER, identity_data: { provider_id: USER } }] };
  const stored = { in_guild: true, past_client: true, discount_percent: 10, synced_at: new Date().toISOString() };
  const { db } = fakeDb(stored);
  assert.equal(await refreshDiscountFor(db, { id: "x", identities: [] }, { config, db, fetchImpl: fakeFetch({}).impl }), 0);
  assert.equal(await refreshDiscountFor(db, user, { config, db, fetchImpl: fakeFetch({}).impl }), 10);
});

test("forget: removes the linked role and the stored row", async () => {
  const f = fakeFetch({ [`DELETE ${memberUrl}/roles/${LINKED}`]: { status: 204 } });
  const { db, writes } = fakeDb();
  await forgetDiscordLink("client-1", USER, { config, db, fetchImpl: f.impl });
  assert.equal(f.calls[0].method, "DELETE");
  assert.deepEqual(writes.map((w) => w.op), ["delete"]);
});
