import type { DiscordConfig } from "@/lib/discord/config";
import type { DiscordMember, GuildRole } from "@/lib/discord/api";

export type DiscordIdentity = { discordUserId: string; username: string };

type IdentityLike = {
  provider?: string;
  id?: string;
  identity_data?: Record<string, unknown> | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The Discord account linked to this Supabase user, taken from the identities
 * the auth server returned for the session (getUser), never from the browser.
 */
export function discordIdentityOf(user: { identities?: IdentityLike[] | null } | null | undefined): DiscordIdentity | null {
  const identity = user?.identities?.find((i) => i.provider === "discord");
  if (!identity) return null;
  const data = identity.identity_data ?? {};
  const discordUserId = [text(data.provider_id), text(data.sub), text(identity.id)].find((v) => /^\d{15,25}$/.test(v));
  if (!discordUserId) return null;
  const claims = (data.custom_claims ?? {}) as Record<string, unknown>;
  const username = (text(claims.global_name) || text(data.full_name) || text(data.name) || text(data.user_name)).slice(0, 100);
  return { discordUserId, username };
}

export type DiscordPerks = {
  inGuild: boolean;
  hasLinkedRole: boolean;
  /** Holds at least one discount role. Stored as past_client for the SQL trigger. */
  pastClient: boolean;
  discountPercent: number;
  discountRoleId: string | null;
};

const NO_PERKS: DiscordPerks = { inGuild: false, hasLinkedRole: false, pastClient: false, discountPercent: 0, discountRoleId: null };

/** The member's best discount role wins; discounts never stack. */
export function perksFor(member: DiscordMember | null, config: DiscordConfig): DiscordPerks {
  if (!member) return NO_PERKS;
  const best = config.discountRoles.find((d) => member.roles.includes(d.roleId)) ?? null; // sorted highest first
  return {
    inGuild: true,
    hasLinkedRole: member.roles.includes(config.linkedRoleId),
    pastClient: Boolean(best),
    discountPercent: best?.percent ?? 0,
    discountRoleId: best?.roleId ?? null,
  };
}

export type RoleInfo = { id: string; name: string; color: number };

/** The member's roles with names, top of the server's list first, without @everyone. */
export function memberRoles(roleIds: string[], guildRoles: GuildRole[], guildId: string): RoleInfo[] {
  return guildRoles
    .filter((r) => r.id !== guildId && roleIds.includes(r.id))
    .sort((a, b) => b.position - a.position)
    .map(({ id, name, color }) => ({ id, name, color }));
}

/** Stored role list from the database, defensively parsed. */
export function parseStoredRoles(value: unknown): RoleInfo[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .filter((r) => typeof r.id === "string" && typeof r.name === "string")
    .map((r) => ({ id: r.id as string, name: r.name as string, color: typeof r.color === "number" ? r.color : 0 }));
}

/** Label for the discount, e.g. "VIP Client". Falls back when the role name isn't known. */
export function discountLabel(perks: DiscordPerks, roles: RoleInfo[]) {
  if (!perks.discountRoleId) return null;
  return roles.find((r) => r.id === perks.discountRoleId)?.name || "Client discount";
}

/** How long a role check counts for a new request (matches the SQL trigger). */
export const DISCOUNT_FRESH_MS = 60 * 60 * 1000;

export type StoredLink = {
  in_guild: boolean;
  past_client: boolean;
  discount_percent: number | string;
  synced_at: string;
};

/** The percent the database will apply right now, for showing it in the form. */
export function activeDiscountPercent(link: StoredLink | null | undefined, now = Date.now()) {
  if (!link || !link.in_guild || !link.past_client) return 0;
  const synced = Date.parse(link.synced_at);
  if (!Number.isFinite(synced) || now - synced >= DISCOUNT_FRESH_MS) return 0;
  const pct = Number(link.discount_percent);
  return Number.isFinite(pct) ? Math.min(50, Math.max(0, pct)) : 0;
}

/** Same rounding as the trigger: cut = round(total × pct / 100, 2). */
export function discountOn(total: number, percent: number) {
  if (!(percent > 0) || !(total > 0)) return { cut: 0, total };
  // toFixed first so float noise (55.55 × 10 = 555.4999…) rounds like numeric.
  const cut = Math.round(Number((total * percent).toFixed(6))) / 100;
  return { cut, total: Math.round((total - cut) * 100) / 100 };
}
