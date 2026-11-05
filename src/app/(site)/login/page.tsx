import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { Divider, GoogleButton, SignInForm } from "@/components/auth/AuthForms";
import { getUser, isGoogleEnabled, safeNext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  google: "Google sign-in couldn't start. Please try again, or use email.",
  link: "That link has expired or was opened in a different browser. Please sign in again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const [{ user }, google] = await Promise.all([getUser(), isGoogleEnabled()]);
  if (user) redirect(next);

  return (
    <AuthShell
      eyebrow="Client account"
      title="Sign in"
      intro="Track your commission requests, see quotes, and message me directly."
      footer={
        <>
          New here?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4 hover:text-accent">
            Create an account
          </Link>
        </>
      }
    >
      {google && (
        <>
          <GoogleButton next={next} label="Continue with Google" />
          <Divider />
        </>
      )}
      <SignInForm next={next} initialError={params.error ? ERRORS[params.error] : undefined} />
    </AuthShell>
  );
}
