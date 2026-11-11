import type { Metadata } from "next";
import Link from "next/link";
import StatusChip from "@/components/commissions/StatusChip";
import { requireUser } from "@/lib/auth/session";
import { signOutClient } from "@/lib/client/auth-actions";
import { priceOf } from "@/lib/commissions/status";
import { formatUSD } from "@/lib/services/storefront";
import type { CommissionRequestRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "My requests", robots: { index: false } };

export default async function AccountPage() {
  const { supabase, user } = await requireUser("/account");
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("commission_requests").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
    supabase.from("client_profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  const requests = (rows as CommissionRequestRow[]) ?? [];
  const isGoogle = user.app_metadata?.provider === "google";

  return (
    <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <p className="eyebrow eyebrow-accent">Account</p>
          <h1 className="display-lg">{profile?.display_name ? `Hi, ${profile.display_name}` : "My requests"}</h1>
          <p className="text-body-sm text-ink-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/account/profile" className="spec text-ink-muted hover:text-ink">
            Edit profile
          </Link>
          {!isGoogle && (
            <Link href="/account/password" className="spec text-ink-muted hover:text-ink">
              Change password
            </Link>
          )}
          <form action={signOutClient}>
            <button type="submit" className="spec text-ink-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {requests.length === 0 ? (
        <div className="flex flex-col items-start gap-5 border-t border-line pt-10">
          <p className="max-w-lg text-body-lg text-pretty text-ink-muted">
            No requests yet. Pick a service to send your first one.
          </p>
          <Link href="/services" className="spec bg-accent px-6 py-3.5 text-accent-ink hover:brightness-110">
            Browse services →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {requests.map((r) => (
            <li key={r.id} className="border-b border-line">
              <Link
                href={`/account/requests/${r.id}`}
                className="group grid gap-3 py-6 sm:grid-cols-[6rem_1fr_auto_auto] sm:items-center sm:gap-8"
              >
                <span className="mono-meta">#{r.ref}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-body-lg text-ink transition-colors group-hover:text-accent">{r.service_title}</span>
                  <span className="text-body-sm text-ink-muted">
                    {r.package_name} · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </span>
                <span className="text-body text-ink">{formatUSD(priceOf(r))}</span>
                <StatusChip status={r.status} className="justify-self-start" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
