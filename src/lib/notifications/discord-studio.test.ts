import { test } from "node:test";
import assert from "node:assert/strict";
import { ordersWebhookUrl, postStudioDiscord, studioDiscordMessage } from "./discord-studio";

const HOOK = "https://discord.com/api/webhooks/123456789012345678/abc_DEF-123";

test("only real Discord webhook URLs are used", () => {
  assert.equal(ordersWebhookUrl({ DISCORD_ORDERS_WEBHOOK_URL: ` ${HOOK} ` }), HOOK);
  assert.equal(ordersWebhookUrl({ DISCORD_ORDERS_WEBHOOK_URL: "https://evil.example/api/webhooks/1/x" }), null);
  assert.equal(ordersWebhookUrl({ DISCORD_ORDERS_WEBHOOK_URL: "http://discord.com/api/webhooks/1/x" }), null);
  assert.equal(ordersWebhookUrl({}), null);
});

test("message: one embed linking to the admin page, mentions off, long text clipped", () => {
  const msg = studioDiscordMessage("new_request", {
    subject: "New request #1042: DnD — Half Body ($60)",
    lines: ["Rina requested a Half Body. @everyone look!", "", "x".repeat(5000)],
    ctaPath: "/admin/requests/abc",
  });
  assert.deepEqual(msg.allowed_mentions, { parse: [] });
  assert.equal(msg.embeds.length, 1);
  assert.equal(msg.embeds[0].title, "🆕 New request #1042: DnD — Half Body ($60)");
  assert.match(msg.embeds[0].url ?? "", /\/admin\/requests\/abc$/);
  assert.ok(msg.embeds[0].description.length <= 3500);
  assert.ok(!msg.embeds[0].description.includes("\n\n\n\n"), "blank lines are dropped");
});

test("posting: skipped without a webhook, and a failing Discord never throws", async () => {
  const saved = process.env.DISCORD_ORDERS_WEBHOOK_URL;
  try {
    delete process.env.DISCORD_ORDERS_WEBHOOK_URL;
    let called = false;
    assert.equal(await postStudioDiscord("payment", { subject: "Paid", lines: [] }, (async () => ((called = true), new Response())) as typeof fetch), false);
    assert.equal(called, false);

    process.env.DISCORD_ORDERS_WEBHOOK_URL = HOOK;
    let sent: { url: string; body: string } | null = null;
    const ok = await postStudioDiscord("payment", { subject: "Paid", lines: ["$60"] }, (async (url: string, init: RequestInit) => {
      sent = { url, body: String(init.body) };
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch);
    assert.equal(ok, true);
    assert.equal(sent!.url, HOOK);
    assert.equal(JSON.parse(sent!.body).embeds[0].title, "💸 Paid");

    const down = await postStudioDiscord("payment", { subject: "Paid", lines: [] }, (async () => {
      throw new Error("network down");
    }) as typeof fetch);
    assert.equal(down, false);
  } finally {
    if (saved === undefined) delete process.env.DISCORD_ORDERS_WEBHOOK_URL;
    else process.env.DISCORD_ORDERS_WEBHOOK_URL = saved;
  }
});
