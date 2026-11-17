/*
  Discord settings for account linking and the past-client discount.
  Server-only: never prefix these with NEXT_PUBLIC_. The feature stays hidden
  unless the bot token, server (guild) id and the Web Linked role id are set.

  DISCORD_BOT_TOKEN            Bot token (Developer Portal → Bot → Reset Token)
  DISCORD_GUILD_ID             Your server's id
  DISCORD_LINKED_ROLE_ID       Role the bot gives everyone who links ("Web Linked")
  DISCORD_CLIENT_ROLE_ID       Role you give manually to past clients (optional)
  DISCORD_CLIENT_DISCOUNT_PERCENT  Percent off for that role (default 10, max 50)
  DISCORD_INVITE_URL           Invite shown to linked people who aren't in the server yet
*/

export type DiscordConfig = {
  botToken: string;
  guildId: string;
  linkedRoleId: string;
  clientRoleId: string | null;
  clientDiscountPercent: number;
  inviteUrl: string | null;
};

type Env = Record<string, string | undefined>;

const SNOWFLAKE = /^\d{15,25}$/;

function snowflake(value: string | undefined) {
  const v = value?.trim() ?? "";
  return SNOWFLAKE.test(v) ? v : null;
}

export function parseDiscountPercent(value: string | undefined) {
  if (value === undefined || value.trim() === "") return 10;
  const n = Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.min(50, Math.max(0, Math.round(n * 100) / 100));
}

function inviteUrl(value: string | undefined) {
  const v = value?.trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (host !== "discord.gg" && host !== "discord.com" && host !== "www.discord.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function readDiscordConfig(env: Env = process.env): DiscordConfig | null {
  const botToken = env.DISCORD_BOT_TOKEN?.trim();
  const guildId = snowflake(env.DISCORD_GUILD_ID);
  const linkedRoleId = snowflake(env.DISCORD_LINKED_ROLE_ID);
  if (!botToken || !guildId || !linkedRoleId) return null;
  return {
    botToken,
    guildId,
    linkedRoleId,
    clientRoleId: snowflake(env.DISCORD_CLIENT_ROLE_ID),
    clientDiscountPercent: parseDiscountPercent(env.DISCORD_CLIENT_DISCOUNT_PERCENT),
    inviteUrl: inviteUrl(env.DISCORD_INVITE_URL),
  };
}
