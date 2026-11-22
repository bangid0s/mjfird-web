import { SITE_URL } from "@/lib/site-url";

/*
  Order alerts in a private Discord channel, through a channel webhook.

  DISCORD_ORDERS_WEBHOOK_URL   Server Settings → Integrations → Webhooks → New
                               Webhook → pick the channel → Copy Webhook URL.
                               Server-only secret: anyone holding it can post
                               to that channel. Unset = no Discord alerts.

  A webhook rather than the Fird Studio Desk bot: it can only post to the one
  channel it was made for, and needs no extra bot permissions. Mentions are
  switched off, so a client typing "@everyone" in a message can't ping the
  server.
*/

export type StudioEvent =
  | "new_request"
  | "quote_request"
  | "payment"
  | "message"
  | "cancelled"
  | "review"
  | "inquiry"
  | "waitlist";

const STYLE: Record<StudioEvent, { emoji: string; color: number }> = {
  new_request: { emoji: "🆕", color: 0xf5820b },
  quote_request: { emoji: "📝", color: 0xf5820b },
  payment: { emoji: "💸", color: 0x22a55b },
  message: { emoji: "💬", color: 0x3b82f6 },
  cancelled: { emoji: "✖️", color: 0x9ca3af },
  review: { emoji: "⭐", color: 0xeab308 },
  inquiry: { emoji: "📮", color: 0x8b5cf6 },
  waitlist: { emoji: "⏳", color: 0x6b7280 },
};

const WEBHOOK = /^https:\/\/(?:canary\.|ptb\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

/** The webhook URL if it looks like a real Discord webhook, else null. */
export function ordersWebhookUrl(env: Record<string, string | undefined> = process.env): string | null {
  const url = env.DISCORD_ORDERS_WEBHOOK_URL?.trim() ?? "";
  return WEBHOOK.test(url) ? url : null;
}

function clip(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** The webhook body: one embed, title links to the admin page, no pings. */
export function studioDiscordMessage(event: StudioEvent, alert: { subject: string; lines: string[]; ctaPath?: string }) {
  const style = STYLE[event];
  return {
    username: "mjfird.com",
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: clip(`${style.emoji} ${alert.subject}`, 256),
        description: clip(alert.lines.map((l) => l.trim()).filter(Boolean).join("\n\n"), 3500),
        color: style.color,
        ...(alert.ctaPath && { url: `${SITE_URL}${alert.ctaPath}` }),
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/** Posts the alert. Never throws and gives up after 5 s: an order must not fail on Discord. */
export async function postStudioDiscord(
  event: StudioEvent,
  alert: { subject: string; lines: string[]; ctaPath?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const url = ordersWebhookUrl();
  if (!url) return false;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studioDiscordMessage(event, alert)),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[discord] order alert failed", res.status);
    return res.ok;
  } catch (err) {
    console.error("[discord] order alert failed", err instanceof Error ? err.message : err);
    return false;
  }
}
