import { connectDiscord, disconnectDiscord, refreshDiscord } from "@/lib/client/discord-actions";
import type { RoleInfo } from "@/lib/discord/perks";

export type DiscordPanelLink = {
  username: string;
  inGuild: boolean;
  pastClient: boolean;
  discountPercent: number;
  discountLabel: string | null;
  roles: RoleInfo[];
} | null;

/** Discord's role colour (0 = no colour) as CSS, for the small dot on each role. */
function roleColor(color: number) {
  return color > 0 ? `#${color.toString(16).padStart(6, "0")}` : "var(--color-ink-faint)";
}

const NOTICES: Record<string, { tone: "ok" | "error"; text: string }> = {
  linked: { tone: "ok", text: "Discord connected." },
  refreshed: { tone: "ok", text: "Roles refreshed." },
  unlinked: { tone: "ok", text: "Discord disconnected." },
  taken: { tone: "error", text: "That Discord account is already connected to another account on this site." },
  cancelled: { tone: "error", text: "Discord wasn't connected. You can try again any time." },
  sync_failed: { tone: "error", text: "Discord is connected, but I couldn't check your server roles just now. Press Refresh in a moment." },
  error: { tone: "error", text: "Something went wrong with Discord. Please try again." },
  off: { tone: "error", text: "Discord linking isn't available right now." },
};

const button =
  "spec inline-flex items-center justify-center px-5 py-3 transition-[filter,color,border-color] disabled:opacity-60";

export default function DiscordLinkPanel({
  linked,
  link,
  inviteUrl,
  notice,
}: {
  /** Whether the account has a Discord identity at all. */
  linked: boolean;
  link: DiscordPanelLink;
  inviteUrl: string | null;
  notice?: string;
}) {
  const message = notice ? NOTICES[notice] : undefined;

  return (
    <section aria-labelledby="discord-heading" className="flex flex-col gap-4 border-t border-line pt-8">
      <div className="flex flex-col gap-1">
        <h2 id="discord-heading" className="text-body-lg font-medium text-ink">
          Discord
        </h2>
        <p className="text-body-sm text-pretty text-ink-muted">
          Connect the Discord account you use in the Fird Studio server. Linked members get the <strong className="font-medium text-ink">Web Linked</strong> role, and
          clients get a discount on every order placed here.
        </p>
      </div>

      {message && (
        <p role="status" className={message.tone === "ok" ? "text-body-sm text-ink" : "text-body-sm text-error"}>
          {message.text}
        </p>
      )}

      {!linked ? (
        <form action={connectDiscord}>
          <button type="submit" className={`${button} bg-[#5865F2] text-white hover:brightness-110`}>
            Connect Discord
          </button>
        </form>
      ) : (
        <>
          <dl className="flex flex-col gap-2 border border-line p-4 text-body-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Account</dt>
              <dd className="min-w-0 truncate text-ink">{link?.username || "Connected"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Server</dt>
              <dd className="text-ink">{link?.inGuild ? "Member" : "Not in the server yet"}</dd>
            </div>
            {link?.inGuild && (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3">
                <dt className="shrink-0 text-ink-faint">Roles</dt>
                <dd>
                  {link.roles.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5 sm:justify-end">
                      {link.roles.map((role) => (
                        <li key={role.id} className="inline-flex items-center gap-1.5 border border-line px-2 py-0.5 text-[13px] text-ink">
                          <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: roleColor(role.color) }} />
                          {role.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-ink-muted">Press Refresh roles to load them</span>
                  )}
                </dd>
              </div>
            )}
            {link?.pastClient && link.discountPercent > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Perk</dt>
                <dd className="text-accent">
                  {link.discountLabel ?? "Client"} · {link.discountPercent}% off website orders
                </dd>
              </div>
            )}
          </dl>

          {link && !link.inGuild && (
            <p className="text-body-sm text-pretty text-ink-muted">
              {inviteUrl ? (
                <>
                  <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4 hover:text-accent">
                    Join the Fird Studio server
                  </a>
                  , then press Refresh to get your role.
                </>
              ) : (
                "Join the Fird Studio server, then press Refresh to get your role."
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <form action={refreshDiscord}>
              <button type="submit" className={`${button} border border-line text-ink hover:border-line-strong`}>
                Refresh roles
              </button>
            </form>
            <form action={disconnectDiscord}>
              <button type="submit" className={`${button} text-ink-muted hover:text-ink`}>
                Disconnect
              </button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
