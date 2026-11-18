/*
  The three Discord REST calls the site makes, all with the bot token:
    - read one member of the studio server (404 → not a member)
    - add a role to a member
    - remove a role from a member
  None of these need privileged gateway intents. The bot needs the
  Manage Roles permission, and its own role must sit above the roles it gives.
*/

import type { DiscordConfig } from "@/lib/discord/config";

const API = "https://discord.com/api/v10";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type DiscordMember = { roles: string[] };

export class DiscordApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DiscordApiError";
  }
}

function headers(config: DiscordConfig, reason?: string): HeadersInit {
  const h: Record<string, string> = {
    Authorization: `Bot ${config.botToken}`,
    "User-Agent": "DiscordBot (https://mjfird.com, 1.0)",
  };
  if (reason) h["X-Audit-Log-Reason"] = encodeURIComponent(reason);
  return h;
}

function memberPath(config: DiscordConfig, userId: string) {
  if (!/^\d{15,25}$/.test(userId)) throw new DiscordApiError("Invalid Discord user id.", 400);
  return `${API}/guilds/${config.guildId}/members/${userId}`;
}

/** The member's role ids, or null when they aren't in the server. */
export async function getGuildMember(config: DiscordConfig, userId: string, fetchImpl: FetchLike = fetch): Promise<DiscordMember | null> {
  const res = await fetchImpl(memberPath(config, userId), { headers: headers(config), cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (res.status === 404) {
    await res.body?.cancel().catch(() => undefined);
    return null;
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new DiscordApiError(`Discord member lookup failed (HTTP ${res.status}).`, res.status);
  }
  const data = (await res.json()) as { roles?: unknown };
  const roles = Array.isArray(data.roles) ? data.roles.filter((r): r is string => typeof r === "string") : [];
  return { roles };
}

export type GuildRole = { id: string; name: string; color: number; position: number };

/** Every role in the server (names, colours, order). Needs no extra permission. */
export async function getGuildRoles(config: DiscordConfig, fetchImpl: FetchLike = fetch): Promise<GuildRole[]> {
  const res = await fetchImpl(`${API}/guilds/${config.guildId}/roles`, { headers: headers(config), cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new DiscordApiError(`Discord role list failed (HTTP ${res.status}).`, res.status);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .filter((r) => typeof r.id === "string" && typeof r.name === "string")
    .map((r) => ({
      id: r.id as string,
      name: (r.name as string).slice(0, 100),
      color: typeof r.color === "number" ? r.color : 0,
      position: typeof r.position === "number" ? r.position : 0,
    }));
}

async function roleCall(method: "PUT" | "DELETE", config: DiscordConfig, userId: string, roleId: string, reason: string, fetchImpl: FetchLike) {
  const res = await fetchImpl(`${memberPath(config, userId)}/roles/${roleId}`, {
    method,
    headers: headers(config, reason),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  await res.body?.cancel().catch(() => undefined);
  // 404 on removal means they already left the server — nothing to undo.
  if (res.ok || (method === "DELETE" && res.status === 404)) return;
  throw new DiscordApiError(`Discord role ${method === "PUT" ? "add" : "removal"} failed (HTTP ${res.status}).`, res.status);
}

export function addMemberRole(config: DiscordConfig, userId: string, roleId: string, fetchImpl: FetchLike = fetch) {
  return roleCall("PUT", config, userId, roleId, "Linked their mjfird.com account", fetchImpl);
}

export function removeMemberRole(config: DiscordConfig, userId: string, roleId: string, fetchImpl: FetchLike = fetch) {
  return roleCall("DELETE", config, userId, roleId, "Unlinked their mjfird.com account", fetchImpl);
}
