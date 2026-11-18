/*
  Discord settings for account linking and the past-client discount.
  Server-only: never prefix these with NEXT_PUBLIC_. The feature stays hidden
  unless the bot token, server (guild) id and the Web Linked role id are set.

  DISCORD_BOT_TOKEN            Bot token (Developer Portal → Bot → Reset Token)
  DISCORD_GUILD_ID             Your server's id
  DISCORD_LINKED_ROLE_ID       Role the bot gives everyone who links ("Web Linked")
  DISCORD_DISCOUNT_ROLES       Roles that earn a discount, as roleId:percent pairs,
                               e.g. "111…:5,222…:10". Highest one wins (max 50 each).
  DISCORD_CLIENT_ROLE_ID       Older single-role setting, used only when
  DISCORD_CLIENT_DISCOUNT_PERCENT  DISCORD_DISCOUNT_ROLES is unset (default 10)
  DISCORD_INVITE_URL           Invite shown to linked people who aren't in the server yet
*/

export type DiscountRole = { roleId: string; percent: number };

export type DiscordConfig = {
  botToken: string;
  guildId: string;
  linkedRoleId: string;
  /** Highest percent first. */
  discountRoles: DiscountRole[];
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

/** "roleId:percent,roleId:percent" → valid pairs, highest percent first, zero percents dropped. */
export function parseDiscountRoles(env: Env): DiscountRole[] {
  const list = env.DISCORD_DISCOUNT_ROLES?.trim();
  const pairs: DiscountRole[] = [];
  if (list) {
    for (const part of list.split(",")) {
      const [id, pct] = part.split(":").map((v) => v.trim());
      const roleId = snowflake(id);
      if (!roleId || pct === undefined || pct === "") continue;
      const percent = parseDiscountPercent(pct);
      if (percent > 0 && !pairs.some((p) => p.roleId === roleId)) pairs.push({ roleId, percent });
    }
  } else {
    const roleId = snowflake(env.DISCORD_CLIENT_ROLE_ID);
    const percent = parseDiscountPercent(env.DISCORD_CLIENT_DISCOUNT_PERCENT);
    if (roleId && percent > 0) pairs.push({ roleId, percent });
  }
  return pairs.sort((a, b) => b.percent - a.percent);
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
    discountRoles: parseDiscountRoles(env),
    inviteUrl: inviteUrl(env.DISCORD_INVITE_URL),
  };
}
