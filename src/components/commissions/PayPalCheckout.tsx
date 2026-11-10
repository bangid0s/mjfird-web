"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const orderResponse = z.object({ orderId: z.string().min(1) });
const captureResponse = z.object({ ok: z.literal(true) });
const approvedOrder = z.object({ orderID: z.string().min(1) });

type ButtonsOptions = {
  createOrder: () => Promise<string>;
  onApprove: (data: unknown) => Promise<void>;
  onError: () => void;
  onCancel: () => void;
};

type ButtonActions = {
  render: (el: HTMLElement) => Promise<void>;
  close: () => void;
};

function readProperty(source: object, key: string): unknown {
  if (!(key in source)) return undefined;
  return Reflect.get(source, key);
}

function readButtons(namespace: unknown, options: ButtonsOptions): ButtonActions | null {
  if (typeof namespace !== "object" || namespace === null) return null;
  const factory = readProperty(namespace, "Buttons");
  if (typeof factory !== "function") return null;
  const created: unknown = Reflect.apply(factory, namespace, [options]);
  if (typeof created !== "object" || created === null) return null;
  const render = readProperty(created, "render");
  if (typeof render !== "function") return null;
  const close = readProperty(created, "close");
  return {
    render: (el) => {
      const result = Reflect.apply(render, created, [el]);
      return result instanceof Promise ? result.then(() => undefined) : Promise.resolve();
    },
    close: () => {
      if (typeof close === "function") Reflect.apply(close, created, []);
    },
  };
}

async function postJson(path: string, body: { requestId: string } | { orderId: string }): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error("payment");
  return payload;
}

export function PayPalCheckout({ requestId, clientId }: { requestId: string; clientId: string }) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let actions: ButtonActions | null = null;

    const script = document.createElement("script");
    const params = new URLSearchParams({
      "client-id": clientId,
      currency: "USD",
      intent: "capture",
      "enable-funding": "card",
    });
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;

    const fail = (message: string) => {
      if (!cancelled) setError(message);
    };

    script.addEventListener("error", () => fail("PayPal checkout couldn't load."));
    script.addEventListener("load", () => {
      if (cancelled) return;
      actions = readButtons(readProperty(window, "paypal"), {
        createOrder: async () => {
          const payload = await postJson("/api/payments/paypal/order", { requestId });
          const parsed = orderResponse.safeParse(payload);
          if (!parsed.success) throw new Error("payment");
          return parsed.data.orderId;
        },
        onApprove: async (data) => {
          const approved = approvedOrder.safeParse(data);
          if (!approved.success) {
            fail("Payment could not be confirmed.");
            return;
          }
          const payload = await postJson("/api/payments/paypal/capture", { orderId: approved.data.orderID });
          if (!captureResponse.safeParse(payload).success) {
            fail("Payment could not be confirmed.");
            return;
          }
          setError(null);
          router.refresh();
        },
        onError: () => fail("Payment couldn't finish. You have not been marked paid."),
        onCancel: () => setError(null),
      });
      if (!actions) {
        fail("PayPal checkout couldn't load.");
        return;
      }
      void actions.render(host).catch(() => fail("PayPal checkout couldn't load."));
    });

    document.body.appendChild(script);
    return () => {
      cancelled = true;
      actions?.close();
      script.remove();
      host.replaceChildren();
    };
  }, [clientId, requestId, router]);

  return (
    <div className="flex flex-col gap-3" role="region" aria-label="PayPal checkout">
      <p className="text-body-sm text-ink-muted">Pay the final price in USD. Card details stay with PayPal.</p>
      <div ref={hostRef} aria-label="PayPal" />
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
