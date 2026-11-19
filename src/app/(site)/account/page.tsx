import type { Metadata } from "next";
import AccountShell from "@/components/account/AccountShell";
import RequestOverview, { type OverviewItem } from "@/components/account/RequestOverview";
import { requireUser } from "@/lib/auth/session";
import { isFinished, nextStep } from "@/lib/commissions/next-step";
import { clientPaymentView } from "@/lib/commissions/payment-link";
import { paypalButtonAvailable, readPaypalSandboxConfig } from "@/lib/payments/config";
import { readDiscordConfig } from "@/lib/discord/config";
import { discordIdentityOf } from "@/lib/discord/perks";
import type { CommissionRequestRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "My requests", robots: { index: false } };

const IMAGE = /\.(png|jpe?g|webp|gif|avif)$/i;

/** The picture that best stands for a request: the newest delivery, else the first reference. */
function previewPath(r: Pick<CommissionRequestRow, "delivery_paths" | "reference_paths">) {
  return [...r.delivery_paths].reverse().find((p) => IMAGE.test(p)) ?? r.reference_paths.find((p) => IMAGE.test(p)) ?? null;
}

export default async function AccountPage() {
  const { supabase, user } = await requireUser("/account");
  const [{ data: rows }, { data: profile }, { data: unreadRows }] = await Promise.all([
    supabase.from("commission_requests").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
    supabase.from("client_profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("notifications").select("request_id").eq("user_id", user.id).is("read_at", null).not("request_id", "is", null),
  ]);
  const requests = (rows as CommissionRequestRow[]) ?? [];

  const completedIds = requests.filter((r) => r.status === "completed").map((r) => r.id);
  const previews = requests.map((r) => ({ id: r.id, path: previewPath(r) }));
  const paths = previews.flatMap((p) => (p.path ? [p.path] : []));
  const [{ data: reviews }, { data: signed }] = await Promise.all([
    completedIds.length
      ? supabase.from("testimonials").select("request_id").in("request_id", completedIds)
      : Promise.resolve({ data: [] as { request_id: string }[] }),
    paths.length
      ? supabase.storage.from("commissions").createSignedUrls(paths, 60 * 60)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
  ]);

  const reviewed = new Set((reviews ?? []).map((r) => r.request_id as string));
  const urlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path ?? "", s.signedUrl]));
  const unread = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    const id = row.request_id as string;
    unread.set(id, (unread.get(id) ?? 0) + 1);
  }

  const paypal = readPaypalSandboxConfig();
  const items: OverviewItem[] = requests.map((req) => {
    const view = clientPaymentView({
      status: req.status,
      paymentUrl: req.payment_url,
      finalPrice: req.final_price,
      checkoutAvailable: paypalButtonAvailable(paypal, { status: req.status, currency: req.currency, finalPrice: req.final_price }),
    });
    const preview = previews.find((p) => p.id === req.id)?.path;
    return {
      req,
      step: nextStep({ ...req, hasReview: reviewed.has(req.id), canPay: view.kind === "link" || view.kind === "checkout" }),
      unread: unread.get(req.id) ?? 0,
      thumbUrl: preview ? (urlByPath.get(preview) ?? null) : null,
    };
  });

  const discordNudge = Boolean(readDiscordConfig()) && !discordIdentityOf(user);

  return (
    <AccountShell
      active="requests"
      name={(profile?.display_name as string | undefined) || null}
      email={user.email ?? ""}
      showPassword={user.app_metadata?.provider !== "google"}
      openCount={requests.filter((r) => !isFinished(r.status)).length}
    >
      <RequestOverview items={items} discordNudge={discordNudge} />
    </AccountShell>
  );
}
