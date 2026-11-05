import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { Divider, GoogleButton, SignUpForm } from "@/components/auth/AuthForms";
import { getUser, isGoogleEnabled, safeNext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const [{ user }, google] = await Promise.all([getUser(), isGoogleEnabled()]);
  if (user) redirect(next);

  return (
    <AuthShell
      eyebrow="Client account"
      title="Create an account"
      intro="One account for all your commissions — requests, quotes, payments, and files in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4 hover:text-accent">
            Sign in
          </Link>
        </>
      }
    >
      {google && (
        <>
          <GoogleButton next={next} label="Sign up with Google" />
          <Divider />
        </>
      )}
      <SignUpForm next={next} />
    </AuthShell>
  );
}
