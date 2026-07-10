import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "@/lib/admin/profile-actions";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import PageHeader from "@/components/admin/PageHeader";
import type { ProfileRow } from "@/lib/supabase/types";
import SubmitButton from "@/components/admin/SubmitButton";

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profile")
    .select("*")
    .limit(1)
    .single<ProfileRow>();

  const socialsText = (profile?.socials ?? [])
    .map((s) => `${s.label} | ${s.url}`)
    .join("\n");

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Profile"
        description="Your bio, availability badge, and social links — shown on About, the header, and the footer."
      />

      <form action={saveProfile} className="flex flex-col gap-8">
        <Field label="Name">
          <input name="name" defaultValue={profile?.name ?? ""} className={fieldInputClasses} />
        </Field>

        <Field label="Tagline">
          <input name="tagline" defaultValue={profile?.tagline ?? ""} className={fieldInputClasses} />
        </Field>

        <Field label="Availability status">
          <input
            name="availability_status"
            defaultValue={profile?.availability_status ?? ""}
            placeholder="Open for work"
            className={fieldInputClasses}
          />
        </Field>

        <Field label="Bio">
          <textarea
            name="bio"
            rows={5}
            defaultValue={profile?.bio ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>

        <ImageUploader name="avatar_url" label="Avatar" initialUrl={profile?.avatar_url} />

        <Field label="Resume / CV URL">
          <input
            name="resume_url"
            defaultValue={profile?.resume_url ?? ""}
            placeholder="https://…"
            className={fieldInputClasses}
          />
        </Field>

        <Field label="Socials — one per line, “Label | URL”">
          <textarea
            name="socials"
            rows={4}
            defaultValue={socialsText}
            placeholder={"Instagram | https://instagram.com/mjfird\nYouTube | https://youtube.com/@mjfird"}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>

        <SubmitButton className="self-start">Save profile</SubmitButton>
      </form>
    </div>
  );
}
