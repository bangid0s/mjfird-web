import type { Metadata } from "next";
import AccountShell from "@/components/account/AccountShell";
import ProfileForm from "@/components/account/ProfileForm";
import DiscordLinkPanel from "@/components/account/DiscordLinkPanel";
import { requireUser } from "@/lib/auth/session";
import { accountShellData } from "@/lib/account/shell";
import { readDiscordConfig } from "@/lib/discord/config";
import { discordIdentityOf, parseStoredRoles } from "@/lib/discord/perks";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ discord?: string }> }) {
  const { supabase, user } = await requireUser("/account/profile");
  const { discord: notice } = await searchParams;
  const discordConfig = readDiscordConfig();
  const [shell, { data }, { data: linkRow }] = await Promise.all([
    accountShellData(supabase, user),
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
    <AccountShell active="profile" {...shell}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,36rem)_minmax(0,24rem)] lg:justify-between lg:gap-16">
        <section aria-labelledby="profile-heading" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="profile-heading" className="text-body-lg font-semibold text-ink">
              Your details
            </h2>
            <p className="text-body-sm text-pretty text-ink-muted">
              Used on your requests, so I know who I&apos;m drawing for and how to reach you.
            </p>
          </div>
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
        </section>
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
      </div>
    </AccountShell>
  );
}
