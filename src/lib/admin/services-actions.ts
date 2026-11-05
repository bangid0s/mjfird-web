"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/types";
import { parseGallery } from "@/lib/admin/form-parse";
import {
  AVAILABILITY,
  addonSchema,
  faqSchema,
  packageSchema,
  parseList,
  questionSchema,
  slugify,
  type Availability,
} from "@/lib/services/storefront";

function lines(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function optionalInt(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (value === "") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parsePayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const availability = String(formData.get("availability") ?? "open") as Availability;
  return {
    title,
    slug: slugify(String(formData.get("slug") ?? "")) || slugify(title) || `service-${Date.now()}`,
    category: String(formData.get("category") ?? "").trim(),
    description: String(formData.get("description") ?? ""),
    details: String(formData.get("details") ?? ""),
    deliverables: lines(formData.get("deliverables")),
    image_url: normalizeMediaUrl(String(formData.get("image_url") ?? "")) || null,
    status: String(formData.get("status") ?? "draft") as ContentStatus,
    availability: AVAILABILITY.includes(availability) ? availability : "open",
    slots_total: optionalInt(formData.get("slots_total")),
    slots_taken: optionalInt(formData.get("slots_taken")) ?? 0,
    samples: parseGallery(String(formData.get("samples") ?? "")),
    packages: parseList(packageSchema, String(formData.get("packages") ?? "")),
    addons: parseList(addonSchema, String(formData.get("addons") ?? "")),
    faq: parseList(faqSchema, String(formData.get("faq") ?? "")),
    questions: parseList(questionSchema, String(formData.get("questions") ?? "")),
    will_draw: lines(formData.get("will_draw")),
    wont_draw: lines(formData.get("wont_draw")),
    terms: String(formData.get("terms") ?? ""),
  };
}

function saveError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return new Error("Could not save service: another service already uses that URL slug. Pick a different one.");
  }
  return new Error(`Could not save service: ${error.message}`);
}

function revalidateServices() {
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  // Every detail page — a renamed slug must drop its old page too.
  revalidatePath("/services/[slug]", "page");
}

export async function createService(formData: FormData) {
  const supabase = await createClient();
  const payload = parsePayload(formData);
  const { error } = await supabase.from("services").insert(payload);
  if (error) throw saveError(error);
  revalidateServices();
  redirect("/admin/services");
}

export async function updateService(id: string, formData: FormData) {
  const supabase = await createClient();
  const payload = parsePayload(formData);
  const { error } = await supabase.from("services").update(payload).eq("id", id);
  if (error) throw saveError(error);
  revalidateServices();
  redirect("/admin/services");
}

export async function deleteService(id: string) {
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", id);
  revalidateServices();
}

export async function reorderServices(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("services").update({ sort_order: index }).eq("id", id)),
  );
  revalidateServices();
}
