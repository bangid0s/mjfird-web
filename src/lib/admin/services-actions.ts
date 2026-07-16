"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/types";

function parsePayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    deliverables: String(formData.get("deliverables") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    image_url: normalizeMediaUrl(String(formData.get("image_url") ?? "")) || null,
    status: String(formData.get("status") ?? "draft") as ContentStatus,
  };
}

export async function createService(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert(parsePayload(formData));
  if (error) throw new Error(`Could not save service: ${error.message}`);
  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect("/admin/services");
}

export async function updateService(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(parsePayload(formData)).eq("id", id);
  if (error) throw new Error(`Could not save service: ${error.message}`);
  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect("/admin/services");
}

export async function deleteService(id: string) {
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/admin/services");
  revalidatePath("/services");
}

export async function reorderServices(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("services").update({ sort_order: index }).eq("id", id)),
  );
  revalidatePath("/admin/services");
  revalidatePath("/services");
}
