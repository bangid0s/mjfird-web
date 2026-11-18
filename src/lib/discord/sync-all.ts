import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscordConfig } from "@/lib/discord/config";
import { getGuildRoles, type FetchLike, type GuildRole } from "@/lib/discord/api";
import { syncDiscordLink } from "@/lib/discord/sync";

export type SyncAllResult =
  | { ok: true; checked: number; synced: number; failed: number; stoppedEarly: boolean }
  | { ok: false; reason: "not_configured" | "db_error" };

export type SyncAllDeps = {
  config: DiscordConfig | null;
  db: SupabaseClient | null;
  fetchImpl?: FetchLike;
  /** Most links checked per run, oldest check first. */
  limit?: number;
  /** Pause between members, to stay well under Discord's rate limits. */
  pauseMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const STOP_AFTER_FAILURES = 3;

/**
 * Re-check every linked client: gives Web Linked to people who joined the
 * server after linking, and refreshes past-client status for the profile page.
 * Stops early when Discord keeps failing (down, or rate limiting us).
 */
export async function syncAllDiscordLinks(deps: SyncAllDeps): Promise<SyncAllResult> {
  const { config, db, fetchImpl, limit = 100, pauseMs = 250 } = deps;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  if (!config || !db) return { ok: false, reason: "not_configured" };

  const { data, error } = await db
    .from("client_discord_links")
    .select("client_id, discord_user_id, discord_username")
    .order("synced_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[discord] could not list links:", error.message);
    return { ok: false, reason: "db_error" };
  }

  // One role-list call for the whole run instead of one per member.
  let guildRoles: GuildRole[] | null = null;
  try {
    guildRoles = await getGuildRoles(config, fetchImpl);
  } catch (err) {
    console.error("[discord] role list failed:", err instanceof Error ? err.message : "unknown error");
  }

  const rows = (data ?? []) as { client_id: string; discord_user_id: string; discord_username: string | null }[];
  let synced = 0;
  let failed = 0;
  let streak = 0;
  let checked = 0;
  for (const row of rows) {
    if (checked > 0 && pauseMs > 0) await sleep(pauseMs);
    checked++;
    const result = await syncDiscordLink(
      row.client_id,
      { discordUserId: row.discord_user_id, username: row.discord_username ?? "" },
      { config, db, fetchImpl, guildRoles },
    );
    if (result.ok) {
      synced++;
      streak = 0;
    } else {
      failed++;
      streak++;
      if (streak >= STOP_AFTER_FAILURES) {
        return { ok: true, checked, synced, failed, stoppedEarly: checked < rows.length };
      }
    }
  }
  return { ok: true, checked, synced, failed, stoppedEarly: false };
}
