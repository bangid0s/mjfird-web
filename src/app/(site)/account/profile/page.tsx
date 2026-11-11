import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ProfileForm from "@/components/account/ProfileForm";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default async function ProfilePage() {
  const { supabase, user } = await requireUser("/account/profile");
  const { data } = await supabase
    .from("client_profiles")
    .select("display_name, region, discord, x_handle, social_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AuthShell
      eyebrow="Account"
      title="My profile"
      footer={
        <Link href="/account" className="text-ink underline underline-offset-4 hover:text-accent">
          Back to my requests
        </Link>
      }
    >
      <ProfileForm
        email={user.email ?? ""}
        initial={{
          display_name: data?.display_name ?? "",
          region: data?.region ?? "",
          discord: data?.discord ?? "",
          x_handle: data?.x_handle ?? "",
          social_url: data?.social_url ?? "",
        }}
      />
    </AuthShell>
  );
}
