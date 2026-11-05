import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/AuthForms";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Change password", robots: { index: false } };

export default async function PasswordPage() {
  await requireUser("/account/password");
  return (
    <AuthShell
      eyebrow="Account"
      title="Choose a new password"
      footer={
        <Link href="/account" className="text-ink underline underline-offset-4 hover:text-accent">
          Back to my requests
        </Link>
      }
    >
      <NewPasswordForm />
    </AuthShell>
  );
}
