"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();

  const socialsRaw = String(formData.get("socials") ?? "");
  const socials = socialsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((part) => part.trim());
      return { label: label ?? "", url: url ?? "" };
    })
    .filter((s) => s.label && s.url);

  const { data: existing } = await supabase.from("profile").select("id").limit(1).single();

  const payload = {
    name: String(formData.get("name") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    avatar_url: String(formData.get("avatar_url") ?? "") || null,
    resume_url: String(formData.get("resume_url") ?? "") || null,
    availability_status: String(formData.get("availability_status") ?? ""),
    socials,
  };

  if (existing) {
    await supabase.from("profile").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("profile").insert(payload);
  }

  revalidatePath("/admin/profile");
  revalidatePath("/about");
}
