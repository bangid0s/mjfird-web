"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/types";

function parsePayload(formData: FormData) {
  return {
    label: String(formData.get("label") ?? ""),
    url: normalizeMediaUrl(String(formData.get("url") ?? "")),
    description: String(formData.get("description") ?? "") || null,
    emoji: String(formData.get("emoji") ?? "") || null,
    highlight: formData.get("highlight") === "on",
    status: String(formData.get("status") ?? "published") as ContentStatus,
  };
}

export async function createLinkItem(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.label || !payload.url) return;
  const supabase = await createClient();
  await supabase.from("link_page_items").insert(payload);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

export async function updateLinkItem(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("link_page_items").update(parsePayload(formData)).eq("id", id);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

export async function deleteLinkItem(id: string) {
  const supabase = await createClient();
  await supabase.from("link_page_items").delete().eq("id", id);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

export async function reorderLinkItems(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("link_page_items").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/links");
  revalidatePath("/links");
}
