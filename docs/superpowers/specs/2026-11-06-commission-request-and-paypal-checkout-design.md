# Commission request form + PayPal checkout — design

Date: 2026-11-06
Status: approved in conversation, pending written-spec review
Builds on: storefront Phase 1 (PR #34) and client accounts + requests Phase 2 (PR #35)

## 1. Goal

Make every service on `/services` take a VGen-style commission request:
the client fills a form specific to that service, the artist reviews and
quotes, the client pays in full online, and work starts. Payment is PayPal
Checkout (PayPal balance **and** debit/credit card as guest). The payment
code is provider-agnostic so a second gateway (Midtrans or Xendit, IDR cards)
can be added later without restructuring.

### Decisions made with the owner

| Topic | Decision |
|---|---|
| Payment structure | Full payment up front (100%) before work starts. No deposits. |
| Pricing display | Packages with prices **plus** a "Custom quote" option for anything outside them. |
| Gateway, this phase | PayPal Checkout with PayPal + card buttons. Provider abstraction ready for a second gateway. |
| Stripe | Not built. Stripe Indonesia accounts only take IDR bank transfer (virtual account): no cards, no cross-border, no USD. Revisit only if the owner gets a Stripe account in a supported country. |
| Midtrans / Xendit | Deferred. Both accept foreign cards with IDR settlement. Add only if clients are actually blocked at PayPal. |
| Currency | USD everywhere (unchanged). |

### Why the current site sends clients to Contact

All three live services (`brand-graphic-design`, `illustration-character-art`,
`card-game-art`) have zero packages and zero questions. `ServiceOrderPanel`
and `services/[slug]/request/page.tsx` treat "no packages" as "not
requestable" and link to `/contact?service=…`. The form, questions engine,
and request pipeline already exist. This phase removes that gate and finishes
the money side.

### Out of scope

Deposits/milestones, tipping, coupons, in-app refunds, a second payment
gateway, multi-currency, tax/invoice PDFs.

## 2. Part 1 — request flow and per-service form (PR 1)

### 2.1 Custom quote option

- A virtual package with id `custom` is always offered **in addition to** the
  service's packages. If a service has no packages, it is the only option and
  is preselected.
- Label "Custom — priced after I read your brief". No price, delivery days or
  revisions shown; the summary reads "Price sent with acceptance".
- `submit_commission_request()` accepts `p_package_id = 'custom'` and stores
  `package_id = 'custom'`, `package_name = 'Custom quote'`, `package_price = 0`,
  `delivery_days = null`, `revisions = null`, `estimated_total = 0`.
  Add-ons are hidden in the form for custom, and the function stores no
  add-ons for a custom request even if ids are sent.
- The `custom` id is reserved: the admin package editor rejects a package with
  id `custom`.

### 2.2 Service page and cards

- `ServiceOrderPanel`: always links to `/services/[slug]/request?package=…`.
  The `/contact` fallback is removed. Contact stays for general inquiries.
- `services/[slug]/request/page.tsx`: shows the form unless the service is
  closed (the `packages.length === 0` check is removed).
- `ServiceCard`: "From $X" when packages exist, "Quote on request" otherwise
  (unchanged behaviour).

### 2.3 Request form order

1. Package (incl. Custom) + add-ons, with live estimate or "price sent with
   acceptance".
2. Service-specific questions (existing engine: short, long, select,
   checkbox, file; required flag; help text).
3. Brief + reference uploads (existing).
4. **Terms checkbox** — "I agree to the terms for this service", linking to
   the service's terms section. Required when the service has non-empty
   terms. Stored as `terms_accepted_at`.
5. Submit — no payment at this step.

### 2.4 Seeded questions

A migration seeds draft questions for the three live services **only if their
`questions` array is empty**, so it never overwrites the owner's edits. The
owner edits them in `/admin/services/[id]`.

- Brand & Graphic Design: brand/business name (short, required); deliverables
  needed (checkbox: logo, business card, social media kit, packaging, other);
  style direction (long); deadline (short); existing logo/brand files (file).
- Illustration & Character Art: number of characters (select 1/2/3/4+,
  required); framing (select: bust, half body, full body, required);
  background (select: none, simple, detailed); usage (select: personal,
  commercial, required); character references (file, required).
- Card & Game Art: card size/format (short, required); number of artworks
  (short, required); game/IP title (short); commercial rights needed (select:
  yes, no, required); card template or frame (file).

### 2.5 Admin acceptance

- Accept requires a final price. For a package request the field defaults to
  `estimated_total`; for `custom` it starts empty and is required (> 0).
- On accept: status `awaiting_payment`, `final_price`, `accepted_at`,
  `quote_expires_at = now() + 7 days`, slot reserved (existing behaviour),
  client email "Your request was accepted — pay to start".
- Decline and message thread: unchanged.

### 2.6 Quote expiry

- Column `quote_expires_at timestamptz` on `commission_requests`.
- `expire_unpaid_quotes()` (security definer) cancels `awaiting_payment` rows
  past `quote_expires_at`, sets `artist_note` to "Quote expired — message me
  to reopen", and releases the slot.
- Scheduled daily with `pg_cron` inside Supabase (no app secret needed). If
  `pg_cron` isn't available on the project, the migration skips scheduling
  and the checkout endpoint still refuses expired quotes.
- Admin can extend: "Extend 7 days" button on an `awaiting_payment` request.

### 2.7 Part 1 files

- `supabase/migrations/0030_custom_quote_terms_expiry.sql` — new columns,
  updated `submit_commission_request()` (new `p_terms_accepted boolean` arg),
  `expire_unpaid_quotes()`, cron schedule, seeded questions.
- `src/lib/services/storefront.ts` — `CUSTOM_PACKAGE_ID`, quote helper for
  custom.
- `src/components/services/ServiceOrderPanel.tsx`, `RequestForm.tsx`,
  `src/app/(site)/services/[slug]/request/page.tsx`.
- `src/components/admin/RequestActions.tsx`, `src/lib/admin/requests-actions.ts`
  (required price for custom, expiry, extend).
- `src/components/admin/ServiceBuilderEditors.tsx` (reject `custom` id).
- `src/lib/commissions/status.ts`, `src/lib/supabase/types.ts`.

## 3. Part 2 — PayPal checkout (PR 2)

### 3.1 Client experience

On `/account/requests/[id]` while `awaiting_payment`: order summary, final
price in USD, "pay by <date>", and PayPal's official buttons (PayPal + Debit
or Credit Card) via the PayPal JS SDK. Card data stays inside PayPal. After
capture the page shows "In progress" and the client receives a receipt email;
the owner receives "Payment received".

### 3.2 Flow

1. `POST /api/payments/paypal/order` `{ requestId }` — authenticated client.
   Server loads the request with the user's session, checks owner, status
   `awaiting_payment`, not expired, `final_price > 0`. Creates a PayPal order
   (Orders v2, intent CAPTURE) with amount = `final_price` from the DB,
   currency USD, `custom_id = request id`, `invoice_id = MJF-<ref>`. Inserts a
   `payments` row (`status = 'created'`). Returns the PayPal order id.
2. Client approves in the PayPal popup.
3. `POST /api/payments/paypal/capture` `{ orderId }` — authenticated client.
   Server captures, then requires capture status `COMPLETED`, currency `USD`
   and amount equal to the stored `final_price`. On success calls
   `mark_commission_paid()`.
4. `POST /api/webhooks/paypal` — verifies the signature with PayPal's
   verify-webhook-signature API using `PAYPAL_WEBHOOK_ID`; handles
   `PAYMENT.CAPTURE.COMPLETED` (safety net for a closed browser),
   `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`,
   `PAYMENT.CAPTURE.DENIED`. Unknown events return 200 and are ignored.

All writes go through idempotent database functions keyed on the PayPal
capture id, so a capture arriving from both step 3 and the webhook is
recorded once.

### 3.3 Data

```
payments
  id uuid pk
  request_id uuid → commission_requests (on delete restrict)
  provider text check in ('paypal', 'manual')   -- later: 'midtrans', 'xendit'
  provider_order_id text
  provider_capture_id text unique
  amount numeric(10,2), currency text
  status text check in ('created','completed','refunded','partially_refunded','failed')
  raw jsonb  -- last provider payload, for support
  created_at, updated_at
unique (provider, provider_order_id)
```

RLS: client reads own (via request), admin reads all, no client writes.

- `commission_status` gains `refunded`.
- `mark_commission_paid(request_id, provider, order_id, capture_id, amount,
  currency)` — security definer, executable by `service_role` only. Verifies
  `awaiting_payment` and amount; sets `in_progress` and `paid_at`; upserts the
  payment row. A repeat call with the same capture id is a no-op.
- `record_commission_refund(capture_id, refunded_amount, full boolean)` —
  full refund sets the request to `refunded` and releases the slot; partial
  refund only updates the payment row.
- Manual payment: the existing admin "Mark paid & start work" button stays
  and writes a `provider = 'manual'` payment row.

### 3.4 Code layout

- `src/lib/payments/core.ts` — provider-agnostic rules: `amountDue(request)`,
  `assertPayable(request, now)`, amount/currency comparison in cents.
- `src/lib/payments/paypal.ts` — OAuth token, create order, capture, verify
  webhook. `PAYPAL_ENV` picks `api-m.sandbox.paypal.com` or `api-m.paypal.com`.
  Uses `fetch`; no PayPal server SDK dependency.
- `src/lib/supabase/admin.ts` — service-role client, `import "server-only"`,
  used only by the payment routes.
- `src/app/api/payments/paypal/order/route.ts`, `.../capture/route.ts`,
  `src/app/api/webhooks/paypal/route.ts`.
- `src/components/commissions/PayPalCheckout.tsx` — client component loading
  the JS SDK with `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `currency=USD`,
  `intent=capture`, `enable-funding=card`.
- `supabase/migrations/0031_payments.sql`.
- Emails in `src/lib/email.ts`: receipt to client, payment notice to owner,
  refund notice to client.

Before writing route handlers, read the route-handler guide in
`node_modules/next/dist/docs/` (this repo's Next.js version has breaking
changes, per AGENTS.md).

### 3.5 Errors

- Not owner / wrong status / expired → 409 with a plain message; the UI
  shows "This quote can't be paid right now — message me".
- Capture amount or currency mismatch → do not mark paid; payment row
  `failed`; owner emailed to investigate.
- PayPal API down → 502; buttons show "Payment couldn't start, try again".
- Webhook signature invalid → 400, nothing written.
- Payment env vars missing → buttons hidden, existing "I'll message you the
  payment link" text shown (same as today), so the site works before setup.

### 3.6 Configuration (owner types every secret into the page)

1. PayPal Business account (free upgrade from personal).
2. Turn on "PayPal account optional" (Account Settings → Website payments) so
   guests see the card option.
3. developer.paypal.com → app → Client ID + Secret, sandbox and live.
4. Webhook pointing at `https://mjfird.com/api/webhooks/paypal` with the four
   events above → Webhook ID.
5. Vercel env (Production + Preview): `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`,
   `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`,
   `SUPABASE_SERVICE_ROLE_KEY`. Preview uses sandbox keys.

PayPal fees: international transaction fee plus currency conversion on
withdrawal to an Indonesian bank. The owner checks current rates on PayPal
Indonesia's fee page.

## 4. Testing

- Add Vitest (repo has no test runner). Unit tests for `core.ts` (amount due,
  payable checks, cent comparison), custom-package quoting, and the webhook
  handler with a mocked PayPal client: completed, duplicate completed, amount
  mismatch, full refund, partial refund, bad signature.
- SQL checks run against the live project in read-only mode where possible;
  migration functions exercised on a preview deploy.
- End to end on a Vercel preview with PayPal sandbox: request (package and
  custom) → admin accept → pay with sandbox PayPal → pay with sandbox card →
  status In progress → refund in sandbox → status Refunded.
- `npm run lint` and `npm run build` pass for each PR.

## 5. Rollout

1. PR 1 (Part 1) — useful on its own: every service takes requests; owner
   marks payments manually.
2. Owner sets up PayPal sandbox + live (guided in the browser).
3. PR 2 (Part 2) with sandbox on preview, verified end to end.
4. Switch production env to live keys; one real low-value payment, then refund
   it, to confirm the live webhook.
