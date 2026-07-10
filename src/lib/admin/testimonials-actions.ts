"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContentStatus } from "@/lib/supabase/types";

function parsePayload(formData: FormData) {
  return {
    quote: String(formData.get("quote") ?? ""),
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? ""),
    avatar_url: String(formData.get("avatar_url") ?? "") || null,
    status: String(formData.get("status") ?? "draft") as ContentStatus,
  };
}

export async function createTestimonial(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("testimonials").insert(parsePayload(formData));
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function updateTestimonial(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("testimonials").update(parsePayload(formData)).eq("id", id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function deleteTestimonial(id: string) {
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function reorderTestimonials(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("testimonials").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}
