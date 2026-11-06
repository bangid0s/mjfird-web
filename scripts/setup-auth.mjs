#!/usr/bin/env node
/*
  Configures Supabase Auth for client accounts through the Management API:
    1. Custom SMTP sender (when SMTP_PASS or RESEND_API_KEY is set)
    2. Branded email templates from supabase/templates/*.html (needs step 1)
    3. Google sign-in (when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set)

  Usage (from the repo root):
    SUPABASE_ACCESS_TOKEN=sbp_... \
    RESEND_API_KEY=re_... \
    GOOGLE_CLIENT_ID=....apps.googleusercontent.com GOOGLE_CLIENT_SECRET=GOCSPX-... \
    node scripts/setup-auth.mjs

  Every part is optional and safe to re-run. Secrets are read from the
  environment only and never written to disk or printed.
*/

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const env = process.env;
const REF = env.SUPABASE_PROJECT_REF ?? "vocrpuxcgkokuxmrkmqo";
const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const headers = { "Content-Type": "application/json" };
if (env.SUPABASE_ACCESS_TOKEN) headers.Authorization = `Bearer ${env.SUPABASE_ACCESS_TOKEN}`;

async function patch(label, body) {
  const res = await fetch(API, { method: "PATCH", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    console.error(`✗ ${label}: HTTP ${res.status} ${await res.text()}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ ${label}`);
  return true;
}

const template = (name) => readFile(path.join(root, "supabase/templates", `${name}.html`), "utf8");

// 1. SMTP — defaults to Resend's SMTP relay (user "resend", password = API key)
let smtpReady = false;
const smtpPass = env.SMTP_PASS ?? env.RESEND_API_KEY;
if (smtpPass) {
  const ok = await patch("SMTP sender", {
    smtp_host: env.SMTP_HOST ?? "smtp.resend.com",
    smtp_port: env.SMTP_PORT ?? "465",
    smtp_user: env.SMTP_USER ?? "resend",
    smtp_pass: smtpPass,
    smtp_admin_email: env.SMTP_FROM ?? "notifications@mjfird.com",
    smtp_sender_name: env.SMTP_SENDER_NAME ?? "MJFIRD",
    smtp_max_frequency: 60,
    rate_limit_email_sent: 60,
  });
  smtpReady = ok;
  // With a real sender, new email sign-ups must confirm their address.
  if (ok) await patch("Require email confirmation", { mailer_autoconfirm: false });
} else {
  console.log("– SMTP skipped (set RESEND_API_KEY or SMTP_PASS)");
}

// 2. Branded templates + subjects (Supabase only allows these with custom SMTP)
if (smtpReady) {
  await patch("Email templates", {
    mailer_subjects_confirmation: "Confirm your MJFIRD client account",
    mailer_subjects_recovery: "Reset your MJFIRD password",
    mailer_subjects_magic_link: "Your MJFIRD sign-in link",
    mailer_subjects_email_change: "Confirm your new email — MJFIRD",
    mailer_templates_confirmation_content: await template("confirmation"),
    mailer_templates_recovery_content: await template("recovery"),
    mailer_templates_magic_link_content: await template("magic_link"),
    mailer_templates_email_change_content: await template("email_change"),
  });
} else {
  console.log("– Templates skipped (need SMTP first)");
}

// 3. Google sign-in
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  await patch("Google provider", {
    external_google_enabled: true,
    external_google_client_id: env.GOOGLE_CLIENT_ID,
    external_google_secret: env.GOOGLE_CLIENT_SECRET,
  });
} else {
  console.log("– Google skipped (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)");
}
