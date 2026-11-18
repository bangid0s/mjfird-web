import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/payments/service-role";
import { readDiscordConfig, type DiscordConfig, type DiscountRole } from "@/lib/discord/config";
import { loadDiscountRoles } from "@/lib/discord/discount-roles";
import { addMemberRole, getGuildMember, getGuildRoles, removeMemberRole, type FetchLike, type GuildRole } from "@/lib/discord/api";
import {
  activeDiscountPercent,
  discordIdentityOf,
  discountLabel,
  memberRoles,
  perksFor,
  type DiscordIdentity,
  type DiscordPerks,
  type RoleInfo,
  type StoredLink,
} from "@/lib/discord/perks";

export type SyncResult =
  | { ok: true; perks: DiscordPerks; roles: RoleInfo[] | null; label: string | null }
  | { ok: false; reason: "not_configured" | "discord_error" | "db_error" };

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceRoleClient(url, key);
}

export type SyncDeps = {
  config: DiscordConfig | null;
  db: SupabaseClient | null;
  fetchImpl?: FetchLike;
  /** The server's role list, when the caller already has it (the daily sync fetches it once). */
  guildRoles?: GuildRole[] | null;
  /** Discount roles in force, when the caller already loaded them (the daily sync loads them once). */
  discountRoles?: DiscountRole[];
};

function defaultDeps(): SyncDeps {
  return { config: readDiscordConfig(), db: serviceClient() };
}

/**
 * Look the member up with the bot, give them the Web Linked role if they're in
 * the server and don't have it, and store what we found. Called after linking,
 * from "Refresh", and right before a request is submitted.
 */
export async function syncDiscordLink(clientId: string, identity: DiscordIdentity, deps: SyncDeps = defaultDeps()): Promise<SyncResult> {
  const { db, fetchImpl } = deps;
  if (!deps.config || !db) return { ok: false, reason: "not_configured" };
  // The admin's list on /admin/discord, or the environment variable until it's saved.
  const config: DiscordConfig = {
    ...deps.config,
    discountRoles: deps.discountRoles ?? (await loadDiscountRoles(db, deps.config.discountRoles)),
  };

  let perks: DiscordPerks;
  let roleIds: string[] = [];
  try {
    const member = await getGuildMember(config, identity.discordUserId, fetchImpl);
    perks = perksFor(member, config);
    roleIds = member?.roles ?? [];
    if (perks.inGuild && !perks.hasLinkedRole) {
      await addMemberRole(config, identity.discordUserId, config.linkedRoleId, fetchImpl);
      perks = { ...perks, hasLinkedRole: true };
      roleIds = [...roleIds, config.linkedRoleId];
    }
  } catch (err) {
    console.error("[discord] sync failed:", err instanceof Error ? err.message : "unknown error");
    return { ok: false, reason: "discord_error" };
  }

  // Role names are a nice-to-have: if the list can't be fetched, keep the old one.
  let roles: RoleInfo[] | null = perks.inGuild ? null : [];
  if (perks.inGuild) {
    let guildRoles = deps.guildRoles ?? null;
    if (!guildRoles) {
      try {
        guildRoles = await getGuildRoles(config, fetchImpl);
      } catch (err) {
        console.error("[discord] role list failed:", err instanceof Error ? err.message : "unknown error");
      }
    }
    if (guildRoles) roles = memberRoles(roleIds, guildRoles, config.guildId);
  }
  const label = discountLabel(perks, roles ?? []);

  const { error } = await db.from("client_discord_links").upsert(
    {
      client_id: clientId,
      discord_user_id: identity.discordUserId,
      discord_username: identity.username,
      in_guild: perks.inGuild,
      past_client: perks.pastClient,
      discount_percent: perks.discountPercent,
      discount_label: label,
      ...(roles ? { roles } : {}),
      synced_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );
  if (error) {
    console.error("[discord] could not save link:", error.message);
    return { ok: false, reason: "db_error" };
  }
  return { ok: true, perks, roles, label };
}

/** Take the Web Linked role back and forget the stored link. */
export async function forgetDiscordLink(clientId: string, discordUserId: string | null, deps: SyncDeps = defaultDeps()) {
  const { config, db, fetchImpl } = deps;
  if (config && discordUserId) {
    try {
      await removeMemberRole(config, discordUserId, config.linkedRoleId, fetchImpl);
    } catch (err) {
      console.error("[discord] role removal failed:", err instanceof Error ? err.message : "unknown error");
    }
  }
  if (db) await db.from("client_discord_links").delete().eq("client_id", clientId);
}

type UserLike = NonNullable<Parameters<typeof discordIdentityOf>[0]> & { id: string };

export type ActiveDiscount = { percent: number; label: string | null };

/**
 * Re-check the signed-in client's roles and return the discount a request
 * created right now will get. Falls back to the stored (fresh) result if
 * Discord can't be reached; none when Discord isn't linked or configured.
 */
export async function refreshDiscountFor(
  supabase: SupabaseClient,
  user: UserLike,
  deps: SyncDeps = defaultDeps(),
): Promise<ActiveDiscount> {
  const identity = discordIdentityOf(user);
  if (!deps.config || !identity) return { percent: 0, label: null };
  const synced = await syncDiscordLink(user.id, identity, deps);
  if (synced.ok) return { percent: synced.perks.discountPercent, label: synced.label };
  const { data } = await supabase
    .from("client_discord_links")
    .select("in_guild, past_client, discount_percent, discount_label, synced_at")
    .eq("client_id", user.id)
    .maybeSingle();
  const percent = activeDiscountPercent(data as StoredLink | null);
  return { percent, label: percent > 0 ? ((data as { discount_label?: string | null } | null)?.discount_label ?? null) : null };
}
