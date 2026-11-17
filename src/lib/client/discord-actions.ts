"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/auth/origin";
import { readDiscordConfig } from "@/lib/discord/config";
import { discordIdentityOf } from "@/lib/discord/perks";
import { forgetDiscordLink, syncDiscordLink } from "@/lib/discord/sync";

const PROFILE = "/account/profile";

function back(status: string): never {
  redirect(`${PROFILE}?discord=${status}`);
}

/** Start Discord OAuth to link it to the signed-in account (not a new login). */
export async function connectDiscord() {
  if (!readDiscordConfig()) back("off");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(PROFILE)}`);
  if (discordIdentityOf(user)) back("linked");

  const { data, error } = await supabase.auth.linkIdentity({
    provider: "discord",
    options: { redirectTo: `${await requestOrigin()}/auth/callback?link=discord&next=${encodeURIComponent(PROFILE)}` },
  });
  if (error || !data?.url) {
    console.error("[discord] linkIdentity failed:", error?.message ?? "no url");
    back("error");
  }
  redirect(data.url);
}

/** Re-check server membership and roles (e.g. after joining the server). */
export async function refreshDiscord() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(PROFILE)}`);
  const identity = discordIdentityOf(user);
  if (!identity) back("error");

  const result = await syncDiscordLink(user.id, identity);
  revalidatePath(PROFILE);
  back(result.ok ? "refreshed" : "error");
}

/** Unlink Discord: take the Web Linked role back and remove the identity. */
export async function disconnectDiscord() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(PROFILE)}`);
  const identity = user.identities?.find((i) => i.provider === "discord");
  if (!identity) back("unlinked");

  // Supabase refuses to unlink a user's only identity, so a Discord-only account stays.
  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) {
    console.error("[discord] unlinkIdentity failed:", error.message);
    back("error");
  }
  await forgetDiscordLink(user.id, discordIdentityOf(user)?.discordUserId ?? null);
  revalidatePath(PROFILE);
  back("unlinked");
}
