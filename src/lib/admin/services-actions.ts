"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContentStatus } from "@/lib/supabase/types";

function parsePayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    deliverables: String(formData.get("deliverables") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    status: String(formData.get("status") ?? "draft") as ContentStatus,
  };
}

export async function createService(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("services").insert(parsePayload(formData));
  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect("/admin/services");
}

export async function updateService(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("services").update(parsePayload(formData)).eq("id", id);
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
