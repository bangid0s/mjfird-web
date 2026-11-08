# Isolated client auth setup

The site already has the Google button, email sign-up, and `GET /auth/callback`. Those routes talk to whatever Supabase project is in the environment. This setup is for an **isolated** Supabase project (local or a throwaway cloud project). Do not point the script or these dashboard steps at a production project.

Nothing in this repository changes Auth remotely. Running `scripts/setup-auth.mjs` is a separate step you take yourself, and only after `SUPABASE_PROJECT_REF` is the isolated project.

## Environment names

Set these in the shell for the script. Do not commit the values.

| Name | Where | Notes |
|---|---|---|
| `SUPABASE_PROJECT_REF` | Script process only | Required. No default. |
| `SUPABASE_ACCESS_TOKEN` | Script process only | Supabase account access token. Sent as a bearer header and never logged. |
| `RESEND_API_KEY` or `SMTP_PASS` | Script process, and `RESEND_API_KEY` also in Vercel Preview / `.env.local` for app mail | SMTP password for the script. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM`, `SMTP_SENDER_NAME` | Script process, optional | Defaults: `smtp.resend.com`, `465`, `resend`, `notifications@mjfird.com`, `MJFIRD`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Script process only | Written to the isolated project's Auth provider. The Next app does not read them. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel Preview and `.env.local` | Public. Already used by the app. |
| `NEXT_PUBLIC_SITE_URL` | Vercel Preview and `.env.local` | Public origin, no trailing slash. Local default in the app code is the request host. |
| `RESEND_FROM` | Vercel Preview and `.env.local` | Server-only sender for app mail (`src/lib/email.ts`). |
| `INQUIRY_NOTIFY_EMAIL` | Vercel Preview and `.env.local` | Server-only. |

`SUPABASE_SERVICE_ROLE_KEY` is not used by this script.

## Google provider callback

In the Google Cloud OAuth client for this isolated app, set the authorized redirect URI to:

`https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

That is Supabase's callback, not the Next.js route. Authorized JavaScript origins for local work: `http://localhost:3000`.

## Supabase redirect allow-list

In the isolated project, Authentication → URL configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://<isolated-preview-host>/auth/callback` when you have an isolated preview

The app sends people to `{request origin}/auth/callback` after Google, email confirmation, and password reset (`next=/account/password` for resets). If that URL is not on the allow-list, Supabase will not return to the site.

## Script

From the repo root, with the isolated ref and tokens in the environment (values not shown):

```bash
SUPABASE_PROJECT_REF= \
SUPABASE_ACCESS_TOKEN= \
RESEND_API_KEY= \
GOOGLE_CLIENT_ID= \
GOOGLE_CLIENT_SECRET= \
node scripts/setup-auth.mjs
```

The script applies SMTP, then requires email confirmation, then branded templates, then the Google provider. Each part is skipped when its env names are missing. A failed request prints `✗ <label>: HTTP <status>` and does not print the response body.

You can do the same three steps in the isolated project's Auth dashboard instead of running the script. Copy `supabase/templates/*.html` into the email templates only after custom SMTP is on.

## What this document does not prove

Code and this checklist do not show that an isolated project was actually updated, that Google sign-in completed, or that mail was delivered. Those need a run against an isolated project, which this change does not perform.
