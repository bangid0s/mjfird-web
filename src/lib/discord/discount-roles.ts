import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscountRole } from "@/lib/discord/config";

/*
  Which Discord roles earn a discount, and how much.

  The admin sets these on /admin/discord (table discord_discount_roles,
  0046_discord_discount_roles.sql). Until the page has been saved once the
  table is empty and the DISCORD_DISCOUNT_ROLES environment variable still
  applies, so deploying this changes nothing by itself.
*/

export type DiscountRoleRow = { role_id: string; role_name?: string | null; percent: number | string };

const SNOWFLAKE = /^\d{15,25}$/;

/** Same rules as the database: 0–50, two decimals. Anything else is 0. */
export function clampPercent(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(50, Math.max(0, Math.round(n * 100) / 100));
}

/** Saved rows → roles that actually give a discount, highest percent first. */
export function rolesFromRows(rows: DiscountRoleRow[]): DiscountRole[] {
  const out: DiscountRole[] = [];
  for (const row of rows) {
    if (!SNOWFLAKE.test(row.role_id)) continue;
    const percent = clampPercent(row.percent);
    if (percent > 0 && !out.some((r) => r.roleId === row.role_id)) out.push({ roleId: row.role_id, percent });
  }
  return out.sort((a, b) => b.percent - a.percent);
}

/**
 * The discount roles in force right now: the admin's saved list when there is
 * one, otherwise `fallback` (the environment variable). A database hiccup also
 * falls back, so a role check never fails just because this read did.
 */
export async function loadDiscountRoles(db: SupabaseClient | null, fallback: DiscountRole[]): Promise<DiscountRole[]> {
  if (!db) return fallback;
  try {
    const res = (await db.from("discord_discount_roles").select("role_id, percent")) as unknown as {
      data?: unknown;
      error?: { message: string } | null;
    } | null;
    if (!res || res.error || !Array.isArray(res.data)) {
      if (res?.error) console.error("[discord] could not read discount roles:", res.error.message);
      return fallback;
    }
    if (res.data.length === 0) return fallback;
    return rolesFromRows(res.data as DiscountRoleRow[]);
  } catch (err) {
    console.error("[discord] could not read discount roles:", err instanceof Error ? err.message : "unknown error");
    return fallback;
  }
}

export type FormRole = { roleId: string; name: string; percent: number };

/**
 * Parse the admin form: one `pct:<roleId>` input per role, plus a hidden
 * `name:<roleId>` with the role's name at the time of saving. Only roles that
 * were on the form are returned, each with a clamped percent.
 */
export function parseDiscountForm(form: FormData): FormRole[] {
  const out: FormRole[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("pct:")) continue;
    const roleId = key.slice(4);
    if (!SNOWFLAKE.test(roleId) || out.some((r) => r.roleId === roleId)) continue;
    const name = String(form.get(`name:${roleId}`) ?? "").trim().slice(0, 100);
    out.push({ roleId, name, percent: clampPercent(String(value)) });
  }
  return out;
}
