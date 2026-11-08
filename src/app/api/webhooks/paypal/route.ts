import { NextResponse } from "next/server";
import { handleSandboxWebhook } from "@/lib/payments/checkout";
import { CheckoutDbError } from "@/lib/payments/checkout-db";
import { readPaypalSandboxConfig } from "@/lib/payments/config";
import { createPaypalSandboxClient, PaypalRequestError } from "@/lib/payments/paypal-client";
import { createServiceRoleClient } from "@/lib/payments/service-role";
import { createSupabaseCheckoutDb } from "@/lib/payments/supabase-checkout";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failureCode(err: unknown): string {
  if (err instanceof PaypalRequestError) return err.code;
  if (err instanceof CheckoutDbError) return "database";
  return "error";
}

export async function POST(request: Request) {
  const config = readPaypalSandboxConfig();
  if (!config) {
    return NextResponse.json({ error: "PayPal checkout is not available." }, { status: 404 });
  }

  const rawBody = await request.text();
  try {
    // Webhook has no user session. The user client is unused for writes;
    // completeCapture goes through the service-role RPC, which copies the price.
    const supabase = await createClient();
    const result = await handleSandboxWebhook(
      {
        db: createSupabaseCheckoutDb({
          user: supabase,
          admin: createServiceRoleClient(config.supabaseUrl, config.serviceRoleKey),
        }),
        paypal: createPaypalSandboxClient(config),
        expectedMerchant: config.merchantId,
      },
      { headers: request.headers, rawBody },
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error("[paypal] webhook failed", failureCode(err));
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }
}
