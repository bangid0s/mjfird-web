# PayPal sandbox checkout

Accepted commission requests (`awaiting_payment`, positive USD `final_price`) can show PayPal's sandbox buttons. The server creates the order from the stored final price. The browser cannot set the amount. Capture marks the request `in_progress` only after PayPal reports one completed capture whose currency is USD, whose amount matches that stored price, and whose payee equals `PAYPAL_MERCHANT_ID`. An approval event does not mark the request paid.

If sandbox configuration is incomplete, the request page keeps the existing manual-payment message. Admins can still mark a request paid until a capture is claimed. The database sets `capture_pending` before PayPal is asked to capture and clears it only for a definite non-charge (`DECLINED`, `DENIED`, `FAILED`, or `VOIDED`). A completed capture with the wrong amount, currency, order id, or merchant id is stored and the request stays unpaid. Pending responses, an HTTP 200 without capture rows, and more than one completed capture also keep the claim. Manual mark-paid, cancel, and a direct table update cannot change the request while that claim or a held capture is set. An uncertain result is stored even when no capture id can be parsed, and a later decline does not erase it. `PAYPAL_MERCHANT_ID` stays optional for turning the buttons on. It is not optional for settlement. If it is missing or empty, or the payee is missing, malformed, or different, the capture and the webhook store the result as held and do not mark the request paid. The row keeps the capture id, order id, amount, and observed payee. A later webhook that only matches the amount does not clear that hold. When the configured id and the payee are the same, a clean completed capture can still reconcile an uncertain checkout whose amount, currency, and order also agree. The capture request asks PayPal for `return=representation`. The capture id and amount come only from that response. If it has no order-level payee, the server stores that capture first, then reads `purchase_units[0].payee.merchant_id` from the same order and uses it only when that order contains the same capture id, amount, and currency. A failed or mismatched order read leaves the capture held. An HTTP 200 with no capture rows does not adopt a capture from the order read. A webhook pays only when the configured id, the stored merchant, and the event payee all agree. A missing configured id does not fall back to the stored merchant. Claims are not released by time. If the provider never returns a definite result, those actions stay blocked.

When PayPal sandbox env is off and `commission_paypal_checkouts` does not exist, admin mark-paid and admin cancel keep the previous conditional update. Once that table exists, they use the migration functions and do not fall back.

Create and capture send a stable `PayPal-Request-Id` (`order-<request id>`, `capture-<order id>`). Server-only `PAYPAL_MERCHANT_ID` does not have to be set for checkout to appear, but a missing value never marks a capture paid.

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
| `PAYPAL_MERCHANT_ID` | Server-only | Optional to enable checkout. Required before any capture is marked paid |

The API host is always `https://api-m.sandbox.paypal.com`.

## Isolated database

`supabase/migrations/0030_paypal_sandbox_checkout.sql` adds `commission_paypal_checkouts` (`order_id` nullable until PayPal returns one, plus `capture_pending`) and the reserve, attach, begin, release, complete, manual-pay, and cancel functions. `supabase/migrations/0031_paypal_capture_requires_proven_merchant.sql` replaces only `complete_commission_paypal_capture` so it returns `held` unless `merchant_proven` is true, including when `expected_merchant` is null. Apply `0030` to an **isolated** database that already has `0029_commission_requests.sql`, then apply `0031`. Do not apply either file to a production database as part of this change. The app does not run migrations. `0031` does not update existing rows.

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
