import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { readDiscordConfig } from "@/lib/discord/config";
import { getGuildRoles, type GuildRole } from "@/lib/discord/api";
import { clampPercent, type DiscountRoleRow } from "@/lib/discord/discount-roles";
import { saveDiscordDiscounts } from "@/lib/admin/discord-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import PageHeader from "@/components/admin/PageHeader";
import SubmitButton, { FormActions } from "@/components/admin/SubmitButton";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Discord discounts" };

type Row = { id: string; name: string; color: number; percent: number; isLinkedRole: boolean };

function hex(color: number) {
  return color ? `#${color.toString(16).padStart(6, "0")}` : "var(--color-ink-faint)";
}

function Notice({ tone, children }: { tone: "success" | "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-8 border px-4 py-3 text-body-sm",
        tone === "success" && "border-success/40 bg-success/10 text-ink",
        tone === "error" && "border-error/40 bg-error/10 text-error",
        tone === "info" && "border-line bg-bg-raised text-ink-muted",
      )}
    >
      {children}
    </p>
  );
}

export default async function AdminDiscordPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const config = readDiscordConfig();

  if (!config) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Discord discounts" description="Give clients a discount based on their role in your Discord server." />
        <Notice tone="info">
          Discord isn&apos;t connected yet. Set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID and DISCORD_LINKED_ROLE_ID in Vercel (see
          docs/discord-setup.md), then come back here.
        </Notice>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: savedRows }, guild] = await Promise.all([
    supabase.from("discord_discount_roles").select("role_id, role_name, percent"),
    getGuildRoles(config).then(
      (roles) => ({ ok: true as const, roles }),
      (err: unknown) => {
        console.error("[discord] admin role list failed:", err instanceof Error ? err.message : "unknown error");
        return { ok: false as const, roles: [] as GuildRole[] };
      },
    ),
  ]);

  const stored = (savedRows ?? []) as DiscountRoleRow[];
  const usingEnv = stored.length === 0;
  // What applies today: the saved list, or the Vercel variable until the first save.
  const percentFor = (roleId: string) =>
    usingEnv
      ? (config.discountRoles.find((r) => r.roleId === roleId)?.percent ?? 0)
      : clampPercent(stored.find((r) => r.role_id === roleId)?.percent);

  const rows: Row[] = guild.ok
    ? guild.roles
        .filter((r) => r.id !== config.guildId) // @everyone
        .sort((a, b) => b.position - a.position)
        .map((r) => ({ id: r.id, name: r.name, color: r.color, percent: percentFor(r.id), isLinkedRole: r.id === config.linkedRoleId }))
    : stored.map((r) => ({
        id: r.role_id,
        name: r.role_name || r.role_id,
        color: 0,
        percent: clampPercent(r.percent),
        isLinkedRole: r.role_id === config.linkedRoleId,
      }));

  const active = rows.filter((r) => r.percent > 0).sort((a, b) => b.percent - a.percent);

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Studio"
        title="Discord discounts"
        description="Set a discount for each role in your Discord server. Clients who link Discord on their profile get the highest one they hold, off the estimate of every new request."
      />

      {saved && <Notice tone="success">Saved. Linked members are being re-checked in the background.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {!guild.ok && (
        <Notice tone="error">
          Couldn&apos;t load the role list from Discord right now, so only roles saved before are shown. Try again in a minute.
        </Notice>
      )}
      {usingEnv && guild.ok && (
        <Notice tone="info">
          These percents still come from the DISCORD_DISCOUNT_ROLES setting in Vercel. Once you save here, this page takes over and
          that setting is ignored.
        </Notice>
      )}

      <div className="mb-8 flex flex-col gap-1 border border-line bg-bg-raised px-4 py-3 text-body-sm">
        <span className="font-medium text-ink">In force now</span>
        <span className="text-ink-muted">
          {active.length === 0
            ? "No discounts. Every client pays the full estimate."
            : active.map((r) => `${r.name} ${r.percent}%`).join(" · ")}
        </span>
      </div>

      {rows.length === 0 ? (
        <Notice tone="info">No roles found in the server yet.</Notice>
      ) : (
        <form action={saveDiscordDiscounts} className="flex flex-col gap-6">
          <input type="hidden" name="source" value={guild.ok ? "discord" : "saved"} />
          <ul className="flex flex-col border border-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-4 border-t border-line px-4 py-3 first:border-t-0">
                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: hex(r.color) }} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <label htmlFor={`pct-${r.id}`} className="truncate text-body-sm font-medium text-ink">
                    {r.name}
                  </label>
                  {r.isLinkedRole && (
                    <span className="text-[13px] text-ink-faint">Given to everyone who links. A discount here applies to all of them.</span>
                  )}
                </span>
                <input type="hidden" name={`name:${r.id}`} value={r.name} />
                <span className="relative w-28 shrink-0">
                  <input
                    id={`pct-${r.id}`}
                    name={`pct:${r.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={50}
                    step={0.5}
                    defaultValue={r.percent}
                    className={cn(fieldInputClasses, "pr-8 text-right tabular-nums")}
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body-sm text-ink-faint">
                    %
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-ink-muted">
            <li>0% means the role gives no discount. The maximum is 50%.</li>
            <li>Discounts don&apos;t stack: a client with several roles gets the highest one.</li>
            <li>It applies to new requests only. Requests already sent keep their price.</li>
            <li>Roles are checked again when a client submits a request, so a role you remove in Discord stops counting.</li>
          </ul>

          <FormActions>
            <SubmitButton>Save discounts</SubmitButton>
          </FormActions>
        </form>
      )}
    </div>
  );
}
