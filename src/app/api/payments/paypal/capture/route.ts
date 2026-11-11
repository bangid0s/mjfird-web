import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureSandboxOrder } from "@/lib/payments/checkout";
import { CheckoutDbError } from "@/lib/payments/checkout-db";
import { readPaypalSandboxConfig } from "@/lib/payments/config";
import { createPaypalSandboxClient, PaypalRequestError } from "@/lib/payments/paypal-client";
import { createServiceRoleClient } from "@/lib/payments/service-role";
import { createSupabaseCheckoutDb } from "@/lib/payments/supabase-checkout";
import { isFreshCapture, notifyPaymentReceived } from "@/lib/notifications/payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failureCode(err: unknown): string {
  if (err instanceof PaypalRequestError) return err.code;
  if (err instanceof CheckoutDbError) return "database";
  return "error";
}

export function GET() {
  return NextResponse.json({ error: "PayPal checkout is not available." }, { status: 404 });
}

export async function POST(request: Request) {
  const config = readPaypalSandboxConfig();
  if (!config) {
    return NextResponse.json({ error: "PayPal checkout is not available." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  try {
    const admin = createServiceRoleClient(config.supabaseUrl, config.serviceRoleKey);
    const result = await captureSandboxOrder(
      {
        db: createSupabaseCheckoutDb({ user: supabase, admin }),
        paypal: createPaypalSandboxClient(config),
        userId: user.id,
      },
      body,
    );
    const orderId = (body as { orderId?: unknown } | null)?.orderId;
    if (isFreshCapture(result) && typeof orderId === "string") await notifyPaymentReceived(admin, orderId.trim());
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error("[paypal] capture failed", failureCode(err));
    return NextResponse.json({ error: "Payment couldn't finish. Try again." }, { status: 502 });
  }
}
