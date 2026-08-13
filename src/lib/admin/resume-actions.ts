"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMediaUrl } from "@/lib/media";
import { parseResumeKind } from "@/lib/data/resume";
import type { ContentStatus } from "@/lib/supabase/types";

function linesToList(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

function parsePayload(formData: FormData) {
  return {
    kind: parseResumeKind(String(formData.get("kind") ?? "")),
    role: String(formData.get("role") ?? ""),
    organization: String(formData.get("organization") ?? "") || null,
    period: String(formData.get("period") ?? "") || null,
    location: String(formData.get("location") ?? "") || null,
    summary: String(formData.get("summary") ?? "") || null,
    bullets: linesToList(String(formData.get("bullets") ?? "")),
    status: String(formData.get("status") ?? "published") as ContentStatus,
  };
}

export async function createResumeEntry(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.role) return;
  const supabase = await createClient();
  await supabase.from("resume_entries").insert(payload);
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

export async function updateResumeEntry(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("resume_entries").update(parsePayload(formData)).eq("id", id);
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

export async function deleteResumeEntry(id: string) {
  const supabase = await createClient();
  await supabase.from("resume_entries").delete().eq("id", id);
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

export async function reorderResumeEntries(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("resume_entries").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

function parseToolPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    icon_url: normalizeMediaUrl(String(formData.get("icon_url") ?? "")) || null,
    note: String(formData.get("note") ?? "") || null,
    status: String(formData.get("status") ?? "published") as ContentStatus,
  };
}

export async function createResumeTool(formData: FormData) {
  const payload = parseToolPayload(formData);
  if (!payload.name) return;
  const supabase = await createClient();
  await supabase.from("resume_tools").insert(payload);
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

export async function updateResumeTool(id: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("resume_tools").update(parseToolPayload(formData)).eq("id", id);
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

export async function deleteResumeTool(id: string) {
  const supabase = await createClient();
  await supabase.from("resume_tools").delete().eq("id", id);
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

export async function reorderResumeTools(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("resume_tools").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/resume");
  revalidatePath("/resume");
}

/** One language per line: "Name|Level" — the level is optional. */
function parseLanguages(raw: string) {
  return linesToList(raw)
    .map((line) => {
      const [name, level] = line.split("|").map((part) => part.trim());
      return { name: name ?? "", level: level ?? "" };
    })
    .filter((language) => language.name);
}

export async function updateResumePanel(formData: FormData) {
  const payload = {
    resume_headline: String(formData.get("resume_headline") ?? "").slice(0, 80),
    resume_role: String(formData.get("resume_role") ?? "").slice(0, 120),
    resume_location: String(formData.get("resume_location") ?? "").slice(0, 120),
    resume_summary: String(formData.get("resume_summary") ?? ""),
    resume_email: String(formData.get("resume_email") ?? "").trim(),
    resume_skills: linesToList(String(formData.get("resume_skills") ?? "").replace(/,/g, "\n")),
    resume_pdf_url: normalizeMediaUrl(String(formData.get("resume_pdf_url") ?? "")),
    resume_languages: parseLanguages(String(formData.get("resume_languages") ?? "")),
  };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();
  const { error } = existing
    ? await supabase.from("site_settings").update(payload).eq("id", existing.id)
    : await supabase.from("site_settings").insert(payload);

  if (error) redirect(`/admin/resume?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/resume");
  revalidatePath("/resume");
  redirect("/admin/resume?saved=1");
}
