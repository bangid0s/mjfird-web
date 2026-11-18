/*
  The bot's slash commands, registered as guild commands on the studio server
  (they show up instantly, unlike global commands). Registering is a bulk
  overwrite, so running it again is harmless; the daily sync does it every run.

  DISCORD_APPLICATION_ID   Developer Portal → General Information → Application ID
*/

import type { DiscordConfig } from "@/lib/discord/config";
import { DiscordApiError, type FetchLike } from "@/lib/discord/api";

const API = "https://discord.com/api/v10";
const SNOWFLAKE = /^\d{15,25}$/;

export const COMMANDS = [
  { name: "link", type: 1, description: "Connect your mjfird.com account to get the Web Linked role" },
  { name: "status", type: 1, description: "Check your mjfird.com link and past-client discount" },
] as const;

export type CommandName = (typeof COMMANDS)[number]["name"];

export function readApplicationId(env: Record<string, string | undefined> = process.env) {
  const v = env.DISCORD_APPLICATION_ID?.trim() ?? "";
  return SNOWFLAKE.test(v) ? v : null;
}

export async function registerGuildCommands(config: DiscordConfig, applicationId: string, fetchImpl: FetchLike = fetch) {
  if (!SNOWFLAKE.test(applicationId)) throw new DiscordApiError("Invalid Discord application id.", 400);
  const res = await fetchImpl(`${API}/applications/${applicationId}/guilds/${config.guildId}/commands`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${config.botToken}`,
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (https://mjfird.com, 1.0)",
    },
    body: JSON.stringify(COMMANDS),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  await res.body?.cancel().catch(() => undefined);
  if (!res.ok) throw new DiscordApiError(`Registering slash commands failed (HTTP ${res.status}).`, res.status);
}
