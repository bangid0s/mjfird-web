import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/payments/service-role";
import { readDiscordConfig, type DiscordConfig } from "@/lib/discord/config";
import { addMemberRole, getGuildMember, removeMemberRole, type FetchLike } from "@/lib/discord/api";
import { activeDiscountPercent, discordIdentityOf, perksFor, type DiscordIdentity, type DiscordPerks, type StoredLink } from "@/lib/discord/perks";

export type SyncResult = { ok: true; perks: DiscordPerks } | { ok: false; reason: "not_configured" | "discord_error" | "db_error" };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceRoleClient(url, key);
}

export type SyncDeps = {
  config: DiscordConfig | null;
  db: SupabaseClient | null;
  fetchImpl?: FetchLike;
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
  const { config, db, fetchImpl } = deps;
  if (!config || !db) return { ok: false, reason: "not_configured" };

  let perks: DiscordPerks;
  try {
    const member = await getGuildMember(config, identity.discordUserId, fetchImpl);
    perks = perksFor(member, config);
    if (perks.inGuild && !perks.hasLinkedRole) {
      await addMemberRole(config, identity.discordUserId, config.linkedRoleId, fetchImpl);
      perks = { ...perks, hasLinkedRole: true };
    }
  } catch (err) {
    console.error("[discord] sync failed:", err instanceof Error ? err.message : "unknown error");
    return { ok: false, reason: "discord_error" };
  }

  const { error } = await db.from("client_discord_links").upsert(
    {
      client_id: clientId,
      discord_user_id: identity.discordUserId,
      discord_username: identity.username,
      in_guild: perks.inGuild,
      past_client: perks.pastClient,
      discount_percent: perks.discountPercent,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );
  if (error) {
    console.error("[discord] could not save link:", error.message);
    return { ok: false, reason: "db_error" };
  }
  return { ok: true, perks };
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

/**
 * Re-check the signed-in client's roles and return the discount a request
 * created right now will get. Falls back to the stored (fresh) result if
 * Discord can't be reached; 0 when Discord isn't linked or configured.
 */
export async function refreshDiscountFor(
  supabase: SupabaseClient,
  user: UserLike,
  deps: SyncDeps = defaultDeps(),
): Promise<number> {
  const identity = discordIdentityOf(user);
  if (!deps.config || !identity) return 0;
  const synced = await syncDiscordLink(user.id, identity, deps);
  if (synced.ok) return synced.perks.discountPercent;
  const { data } = await supabase
    .from("client_discord_links")
    .select("in_guild, past_client, discount_percent, synced_at")
    .eq("client_id", user.id)
    .maybeSingle();
  return activeDiscountPercent(data as StoredLink | null);
}
