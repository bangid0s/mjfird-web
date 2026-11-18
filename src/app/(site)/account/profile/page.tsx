import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ProfileForm from "@/components/account/ProfileForm";
import DiscordLinkPanel from "@/components/account/DiscordLinkPanel";
import { requireUser } from "@/lib/auth/session";
import { readDiscordConfig } from "@/lib/discord/config";
import { discordIdentityOf, parseStoredRoles } from "@/lib/discord/perks";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ discord?: string }> }) {
  const { supabase, user } = await requireUser("/account/profile");
  const { discord: notice } = await searchParams;
  const discordConfig = readDiscordConfig();
  const [{ data }, { data: linkRow }] = await Promise.all([
    supabase.from("client_profiles").select("display_name, region, discord, x_handle, social_url").eq("id", user.id).maybeSingle(),
    discordConfig
      ? supabase
          .from("client_discord_links")
          .select("discord_username, in_guild, past_client, discount_percent, discount_label, roles")
          .eq("client_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const identity = discordIdentityOf(user);

  return (
    <AuthShell
      eyebrow="Account"
      title="My profile"
      footer={
        <Link href="/account" className="text-ink underline underline-offset-4 hover:text-accent">
          Back to my requests
        </Link>
      }
    >
      <ProfileForm
        email={user.email ?? ""}
        initial={{
          display_name: data?.display_name ?? "",
          region: data?.region ?? "",
          discord: data?.discord ?? "",
          x_handle: data?.x_handle ?? "",
          social_url: data?.social_url ?? "",
        }}
      />
      {discordConfig && (
        <DiscordLinkPanel
          linked={Boolean(identity)}
          link={
            identity
              ? {
                  username: linkRow?.discord_username || identity.username,
                  inGuild: Boolean(linkRow?.in_guild),
                  pastClient: Boolean(linkRow?.past_client),
                  discountPercent: Number(linkRow?.discount_percent ?? 0),
                  discountLabel: linkRow?.discount_label ?? null,
                  roles: parseStoredRoles(linkRow?.roles),
                }
              : null
          }
          inviteUrl={discordConfig.inviteUrl}
          notice={notice}
        />
      )}
    </AuthShell>
  );
}
