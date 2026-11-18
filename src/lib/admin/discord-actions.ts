"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readDiscordConfig } from "@/lib/discord/config";
import { parseDiscountForm, rolesFromRows } from "@/lib/discord/discount-roles";
import { serviceClient } from "@/lib/discord/sync";
import { syncAllDiscordLinks } from "@/lib/discord/sync-all";

const PAGE = "/admin/discord";

function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params).toString()}`);
}

/**
 * Save the percent for every role shown on /admin/discord. Every role on the
 * form is stored, 0% included, so the saved list (not the environment
 * variable) is what applies from now on. Roles no longer in the server are
 * dropped. Linked members are re-checked in the background so their profile
 * pages show the new percent; a new request always re-checks anyway.
 */
export async function saveDiscordDiscounts(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) back({ error: "Only the studio admin can change discounts." });

  const roles = parseDiscountForm(formData);
  if (roles.length === 0) back({ error: "No roles to save. Reload the page and try again." });

  const now = new Date().toISOString();
  const { error } = await supabase.from("discord_discount_roles").upsert(
    roles.map((r) => ({ role_id: r.roleId, role_name: r.name, percent: r.percent, updated_at: now })),
    { onConflict: "role_id" },
  );
  if (error) back({ error: `Couldn't save: ${error.message}` });

  // Only prune when the form listed the live server roles, not the offline fallback.
  if (formData.get("source") === "discord") {
    const ids = roles.map((r) => r.roleId);
    const { error: pruneError } = await supabase
      .from("discord_discount_roles")
      .delete()
      .not("role_id", "in", `(${ids.join(",")})`);
    if (pruneError) console.error("[discord] could not prune old discount roles:", pruneError.message);
  }

  const config = readDiscordConfig();
  const db = serviceClient();
  if (config && db) {
    const discountRoles = rolesFromRows(roles.map((r) => ({ role_id: r.roleId, percent: r.percent })));
    after(async () => {
      const result = await syncAllDiscordLinks({ config: { ...config, discountRoles }, db });
      if (!result.ok) console.error("[discord] re-check after saving discounts failed:", result.reason);
    });
  }

  revalidatePath(PAGE);
  back({ saved: "1" });
}
