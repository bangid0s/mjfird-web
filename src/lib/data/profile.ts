import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";

export type ProfileData = {
  name: string;
  tagline: string;
  bio: string;
  avatarUrl: string | null;
  availabilityStatus: string;
  socials: { label: string; url: string }[];
};

const placeholderProfile: ProfileData = {
  name: "MJFIRD",
  tagline: "Breaker, designer, builder",
  bio: "I'm MJFIRD — a breaker turned designer and developer. I spent a decade learning how to read a room, cut movement down to what matters, and land clean. I build brands and websites the same way: deliberate, rhythmic, nothing wasted.",
  avatarUrl: null,
  availabilityStatus: "Open for work",
  socials: [
    { label: "Instagram", url: "https://instagram.com" },
    { label: "YouTube", url: "https://youtube.com" },
    { label: "GitHub", url: "https://github.com" },
  ],
};

export async function getProfile(): Promise<ProfileData> {
  if (!isSupabaseConfigured) return placeholderProfile;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("profile").select("*").limit(1).single();
    if (error || !data) return placeholderProfile;
    return {
      name: data.name,
      tagline: data.tagline ?? placeholderProfile.tagline,
      bio: data.bio ?? placeholderProfile.bio,
      avatarUrl: data.avatar_url,
      availabilityStatus: data.availability_status ?? placeholderProfile.availabilityStatus,
      socials: data.socials?.length ? data.socials : placeholderProfile.socials,
    };
  } catch {
    return placeholderProfile;
  }
}
