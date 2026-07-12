"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/types";

// ---------- media ----------
export async function createMedia(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("dance_media").insert({
    kind: String(formData.get("kind") ?? "photo"),
    url: normalizeMediaUrl(String(formData.get("url") ?? "")),
    caption: String(formData.get("caption") ?? ""),
    status: String(formData.get("status") ?? "draft") as ContentStatus,
  });
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}

export async function updateMedia(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("dance_media")
    .update({
      kind: String(formData.get("kind") ?? "photo"),
      url: normalizeMediaUrl(String(formData.get("url") ?? "")),
      caption: String(formData.get("caption") ?? ""),
      status: String(formData.get("status") ?? "draft") as ContentStatus,
    })
    .eq("id", id);
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}

export async function deleteMedia(id: string) {
  const supabase = await createClient();
  await supabase.from("dance_media").delete().eq("id", id);
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}

export async function reorderMedia(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("dance_media").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}

// ---------- battles ----------
export async function createBattle(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("battles").insert({
    year: String(formData.get("year") ?? ""),
    event: String(formData.get("event") ?? ""),
    result: String(formData.get("result") ?? ""),
  });
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}

export async function updateBattle(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("battles")
    .update({
      year: String(formData.get("year") ?? ""),
      event: String(formData.get("event") ?? ""),
      result: String(formData.get("result") ?? ""),
    })
    .eq("id", id);
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}

export async function deleteBattle(id: string) {
  const supabase = await createClient();
  await supabase.from("battles").delete().eq("id", id);
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}

export async function reorderBattles(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("battles").update({ sort_order: index }).eq("id", id)),
  );
  revalidatePath("/admin/dance");
  revalidatePath("/dance");
}
