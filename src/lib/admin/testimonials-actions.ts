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

function refreshPublic() {
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  // Verified reviews also show on their service page.
  revalidatePath("/services", "layout");
}

function friendly(message: string) {
  if (message.includes("review_private")) return "The client asked to keep this review private, so it can't be published.";
  if (message.includes("verified_review_rpc_only")) return "Verified reviews can only be written by the client.";
  return message;
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
  // For verified reviews the database keeps the client's quote and rating as written.
  const { error } = await supabase.from("testimonials").update(parsePayload(formData)).eq("id", id);
  if (error) throw new Error(friendly(error.message));
  refreshPublic();
  redirect("/admin/testimonials");
}

/** One-click approve / unpublish from the list. */
export async function setTestimonialStatus(id: string, status: ContentStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").update({ status }).eq("id", id);
  if (error) throw new Error(friendly(error.message));
  refreshPublic();
}

export async function deleteTestimonial(id: string) {
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", id);
  refreshPublic();
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
