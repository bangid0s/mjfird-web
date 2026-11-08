import { normalizeUsd } from "@/lib/payments/money";

/** Sandbox Orders and webhook verification. There is no live host in this app. */
export const PAYPAL_SANDBOX_API = "https://api-m.sandbox.paypal.com";

export type PaypalSandboxConfig = {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  publicClientId: string;
  serviceRoleKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function required(env: Record<string, string | undefined>, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

/**
 * PayPal stays off unless every name is set and PAYPAL_ENV is exactly `sandbox`.
 * `live`, empty, and any other value all disable checkout.
 */
export function readPaypalSandboxConfig(env: Record<string, string | undefined> = process.env): PaypalSandboxConfig | null {
  if (env.PAYPAL_ENV?.trim() !== "sandbox") return null;
  const clientId = required(env, "PAYPAL_CLIENT_ID");
  const clientSecret = required(env, "PAYPAL_CLIENT_SECRET");
  const webhookId = required(env, "PAYPAL_WEBHOOK_ID");
  const publicClientId = required(env, "NEXT_PUBLIC_PAYPAL_CLIENT_ID");
  const serviceRoleKey = required(env, "SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = required(env, "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = required(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!clientId || !clientSecret || !webhookId || !publicClientId || !serviceRoleKey || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return { clientId, clientSecret, webhookId, publicClientId, serviceRoleKey, supabaseUrl, supabaseAnonKey };
}

export function paypalButtonAvailable(
  config: PaypalSandboxConfig | null,
  request: { status: string; currency: string; finalPrice: unknown },
): boolean {
  return Boolean(config) && request.status === "awaiting_payment" && request.currency === "USD" && normalizeUsd(request.finalPrice) !== null;
}
