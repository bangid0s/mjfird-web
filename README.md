# MJFIRD

Personal site — portfolio, services, and blog — built to the premium spec in
[`MJFIRD-Premium-Website-PRD.md`](./MJFIRD-Premium-Website-PRD.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · GSAP + ScrollTrigger · Lenis ·
Framer Motion · Supabase (Postgres + Auth + Storage) · Resend · Zod

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase configured, every public page runs on the placeholder content in
[`src/lib/placeholder-data.ts`](./src/lib/placeholder-data.ts) — the site is fully
browsable out of the box. `/admin` requires real Supabase credentials (see below).

## Connecting Supabase (to enable the CMS)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in `supabase/migrations/` against it **in order** (SQL editor, or
   `supabase db push` if you have the CLI linked) — `0001` through `0005`.
3. Copy `.env.local.example` to `.env.local` and fill in the Supabase URL/anon key from
   Project Settings → API.
4. Create yourself an admin user under Authentication → Users (email + password) —
   there's no public sign-up, any authenticated user can manage the site.
5. Restart the dev server. Public pages now read from Supabase (falling back to the
   placeholder data if a table is empty); `/admin` is live once you sign in.

Optional: set `RESEND_API_KEY` to email yourself on new inquiries, and
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` to add bot protection to the
contact form (the form currently ships with a honeypot field only).

## Project structure

- `src/app/(site)` — public pages (home, work, services, about, dance, blog, contact).
- `src/app/admin` — the CMS (`(dashboard)` route group is auth-gated by `src/proxy.ts`).
- `src/components` — `motion/` (preloader, cursor, scroll), `hero/` (kinetic wordmark
  signature moment), `case-study/` (the three project templates), `admin/`, `ui/`.
- `src/lib/data` — reads from Supabase when configured, else the placeholder data.
- `supabase/migrations` — schema, RLS policies, and the public `media` storage bucket.

## Deploying

Deploy to Vercel (or any Next.js host) and set the same environment variables from
`.env.local.example` in the host's dashboard.
