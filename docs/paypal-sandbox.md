# PayPal sandbox checkout

Accepted commission requests (`awaiting_payment`, positive USD `final_price`) can show PayPal's sandbox buttons. The server creates the order from the stored final price. The browser cannot set the amount. Capture marks the request `in_progress` only after PayPal reports a completed capture whose currency is USD and whose amount matches that stored price. An approval event does not mark the request paid.

If sandbox configuration is incomplete, the request page keeps the existing manual-payment message. Admins can still use "Mark paid & start work" until a capture is claimed. The database sets `capture_pending` before PayPal is asked to capture. Manual mark-paid and cancel fail while that flag or a stored capture id is set, so a completed charge is recorded instead of dropped. Create and capture send a stable `PayPal-Request-Id` (`order-<request id>`, `capture-<order id>`). A timeout after PayPal succeeds leaves the flag set; the retry uses the same id and stores the capture. A provider response that is not a completed capture clears the flag.

There is no live PayPal host in the code. `PAYPAL_ENV` must be exactly `sandbox`. `live` or any other value disables checkout.

This does not add custom quotes, terms, quote expiry, refunds, or a general payment ledger.

## Environment names

Store these in **Vercel Preview** and in local `.env.local`. Leave them unset in any environment that must not take sandbox payments.

| Name | Exposure | Required |
|---|---|---|
| `PAYPAL_ENV` | Server-only | Exactly `sandbox` |
| `PAYPAL_CLIENT_ID` | Server-only | Sandbox REST app client id |
| `PAYPAL_CLIENT_SECRET` | Server-only | Sandbox REST app secret |
| `PAYPAL_WEBHOOK_ID` | Server-only | Sandbox webhook id |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Public, browser | Same sandbox app's client id, for the JS SDK |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Writes the order/capture binding |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Isolated project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Isolated project anon key |

The API host is always `https://api-m.sandbox.paypal.com`.

## Isolated database

`supabase/migrations/0030_paypal_sandbox_checkout.sql` adds `commission_paypal_checkouts` (`order_id` nullable until PayPal returns one, plus `capture_pending`) and the reserve, attach, begin, release, complete, manual-pay, and cancel functions. Apply that file yourself to an **isolated** database that already has `0029_commission_requests.sql`. Do not apply it to a production database as part of this change. The app does not run migrations.

The functions are revoked from `public`, `anon`, and `authenticated`, and granted to `service_role` when that role exists. Clients cannot call them with the anon key.

## Routes

- `POST /api/payments/paypal/order` with `{ "requestId": "<uuid>" }`
- `POST /api/payments/paypal/capture` with `{ "orderId": "<paypal order id>" }`
- `POST /api/webhooks/paypal`

All three return 404 until the sandbox env names above are set.

## Sandbox webhook

In the PayPal **sandbox** app (not a live app), add a webhook:

1. URL: `https://<isolated-preview-or-tunnel-host>/api/webhooks/paypal`
2. Event: `PAYMENT.CAPTURE.COMPLETED`
3. Copy the webhook id into `PAYPAL_WEBHOOK_ID` in Vercel Preview or `.env.local`.

Localhost is not reachable by PayPal. Use an isolated tunnel or preview host when you want delivery. The handler checks the signature with the sandbox verify API. A missing signature, a non-PayPal certificate URL, a failed verification, or a body that is not a completed capture does not mark the request paid. The same capture id a second time is a duplicate and does not change `paid_at`.

`CHECKOUT.ORDER.APPROVED` is ignored.

## What is implemented vs what was not run

The routes, button, migration file, and local tests are in the repo. This change did not create a PayPal app, register a webhook, apply the migration, or complete a sandbox payment. A passing local test is not an end-to-end sandbox checkout.
