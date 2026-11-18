/*
  Slash commands over HTTP: Discord POSTs each interaction to
  /api/discord/interactions, signed with the application's Ed25519 key.
  No gateway connection and no always-on process, so it runs on Vercel.

  DISCORD_PUBLIC_KEY   Developer Portal → General Information → Public Key
*/

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscordConfig } from "@/lib/discord/config";
import { perksFor } from "@/lib/discord/perks";

export const INTERACTION_PING = 1;
export const INTERACTION_COMMAND = 2;
const RESPONSE_PONG = 1;
const RESPONSE_MESSAGE = 4;
const FLAG_EPHEMERAL = 64;

/** Signatures older than this are refused, so a captured request can't be replayed later. */
const MAX_AGE_SECONDS = 5 * 60;

export function readPublicKey(env: Record<string, string | undefined> = process.env) {
  const v = env.DISCORD_PUBLIC_KEY?.trim().toLowerCase() ?? "";
  return /^[0-9a-f]{64}$/.test(v) ? v : null;
}

function hexBytes(hex: string) {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function verifyDiscordRequest(
  publicKeyHex: string,
  signature: string | null,
  timestamp: string | null,
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!signature || !timestamp || !/^[0-9a-f]{128}$/i.test(signature) || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > MAX_AGE_SECONDS) return false;
  try {
    const key = await crypto.subtle.importKey("raw", hexBytes(publicKeyHex), { name: "Ed25519" }, false, ["verify"]);
    const message = new TextEncoder().encode(timestamp + body);
    return await crypto.subtle.verify("Ed25519", key, hexBytes(signature), message);
  } catch {
    return false;
  }
}

type DiscordUser = { id?: string };
export type Interaction = {
  type?: number;
  guild_id?: string;
  data?: { name?: string };
  member?: { roles?: unknown; user?: DiscordUser };
  user?: DiscordUser;
};

type Button = { type: 2; style: 5; label: string; url: string };
export type InteractionReply =
  | { type: typeof RESPONSE_PONG }
  | {
      type: typeof RESPONSE_MESSAGE;
      data: { content: string; flags: number; components?: { type: 1; components: Button[] }[]; allowed_mentions: { parse: [] } };
    };

export type InteractionDeps = {
  config: DiscordConfig | null;
  db: SupabaseClient | null;
  siteUrl: string;
  now?: () => Date;
  /** Give Web Linked in the background, after the reply is sent. */
  addLinkedRole?: (discordUserId: string) => void;
};

function reply(content: string, buttons: Button[] = []): InteractionReply {
  return {
    type: RESPONSE_MESSAGE,
    data: {
      content,
      flags: FLAG_EPHEMERAL,
      ...(buttons.length ? { components: [{ type: 1 as const, components: buttons }] } : {}),
      allowed_mentions: { parse: [] },
    },
  };
}

function button(label: string, url: string): Button {
  return { type: 2, style: 5, label, url };
}

export async function handleInteraction(interaction: Interaction, deps: InteractionDeps): Promise<InteractionReply> {
  if (interaction.type === INTERACTION_PING) return { type: RESPONSE_PONG };
  if (interaction.type !== INTERACTION_COMMAND) return reply("That action isn't supported.");

  const { config, db, siteUrl } = deps;
  const profileUrl = `${siteUrl}/account/profile`;
  const servicesUrl = `${siteUrl}/services`;
  const name = interaction.data?.name;
  if (name !== "link" && name !== "status") return reply("Unknown command.");
  if (!config || !db) return reply("Account linking isn't switched on yet. Please try again later.");
  if (interaction.guild_id !== config.guildId) return reply("Please use this command inside the Fird Studio server.");

  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? "";
  if (!/^\d{15,25}$/.test(userId)) return reply("Couldn't read your Discord account. Please try again.");

  const { data: link, error } = await db
    .from("client_discord_links")
    .select("client_id")
    .eq("discord_user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[discord] interaction lookup failed:", error.message);
    return reply("Something went wrong on our side. Please try again in a minute.");
  }

  const perkLine = config.clientRoleId
    ? ` Past clients also get ${config.clientDiscountPercent}% off every request sent through the website.`
    : "";

  if (!link) {
    return reply(
      `Your Discord isn't linked to a mjfird.com account yet. Sign in on the website and press **Connect Discord** on your profile to get the Web Linked role.${perkLine}`,
      [button("Connect on mjfird.com", profileUrl)],
    );
  }

  if (name === "link") {
    return reply("Your Discord is already linked to your mjfird.com account. You can manage it from your profile.", [
      button("Open my profile", profileUrl),
    ]);
  }

  // /status: the signed interaction carries the member's current roles, so we
  // can refresh the stored check without another call to Discord.
  const roles = Array.isArray(interaction.member?.roles)
    ? (interaction.member.roles as unknown[]).filter((r): r is string => typeof r === "string")
    : [];
  const perks = perksFor({ roles }, config);
  const now = (deps.now ?? (() => new Date()))();
  const { error: saveError } = await db
    .from("client_discord_links")
    .update({
      in_guild: true,
      past_client: perks.pastClient,
      discount_percent: perks.discountPercent,
      synced_at: now.toISOString(),
    })
    .eq("discord_user_id", userId);
  if (saveError) console.error("[discord] interaction save failed:", saveError.message);
  if (!perks.hasLinkedRole) deps.addLinkedRole?.(userId);

  const lines = ["Your Discord is linked to your mjfird.com account."];
  if (!perks.hasLinkedRole) lines.push("Your Web Linked role is on its way (it can take a few seconds).");
  lines.push(
    perks.pastClient
      ? `Past client discount: **${perks.discountPercent}% off** every request you send through the website.`
      : "No discount on your account right now. The past-client discount comes with the Past Client role.",
  );
  return reply(lines.join("\n"), [button("Open my profile", profileUrl), button("Browse services", servicesUrl)]);
}
