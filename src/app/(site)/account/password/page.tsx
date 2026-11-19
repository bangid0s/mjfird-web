import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountShell from "@/components/account/AccountShell";
import { NewPasswordForm } from "@/components/auth/AuthForms";
import { requireUser } from "@/lib/auth/session";
import { accountShellData } from "@/lib/account/shell";

export const metadata: Metadata = { title: "Change password", robots: { index: false } };

export default async function PasswordPage() {
  const { supabase, user } = await requireUser("/account/password");
  const shell = await accountShellData(supabase, user);
  // Google accounts sign in without a password, so there's nothing to change.
  if (!shell.showPassword) redirect("/account/profile");

  return (
    <AccountShell active="password" {...shell}>
      <section aria-labelledby="password-heading" className="flex max-w-md flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 id="password-heading" className="text-body-lg font-semibold text-ink">
            Change password
          </h2>
          <p className="text-body-sm text-pretty text-ink-muted">You&apos;ll stay signed in on this device after changing it.</p>
        </div>
        <NewPasswordForm />
      </section>
    </AccountShell>
  );
}
