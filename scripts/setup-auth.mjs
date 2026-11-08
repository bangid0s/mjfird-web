#!/usr/bin/env node
/*
  Configures an isolated Supabase project's Auth settings through the Management API:
    1. Custom SMTP sender (when SMTP_PASS or RESEND_API_KEY is set)
    2. Branded email templates from supabase/templates/*.html (needs step 1)
    3. Google sign-in (when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set)

  SUPABASE_PROJECT_REF is required. There is no default project, so this script
  does not target production unless that ref is supplied on purpose.

  Secrets are read from the environment and sent only in the request. Failure
  output is a label and HTTP status — never the response body, headers, or secrets.

  Usage (from the repo root, isolated project only):
    SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... \
    RESEND_API_KEY=... GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
    node scripts/setup-auth.mjs
*/

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function formatAuthSetupFailure(label, status) {
  const code = Number.isInteger(status) ? String(status) : "request failed";
  return `✗ ${label}: HTTP ${code}`;
}

export async function applyAuthPatch({ label, body, fetchImpl, api, headers, log }) {
  const res = await fetchImpl(api, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    await res.body?.cancel?.().catch(() => undefined);
    log.error(formatAuthSetupFailure(label, res.status));
    return false;
  }
  await res.body?.cancel?.().catch(() => undefined);
  log.log(`✓ ${label}`);
  return true;
}

const template = (dir, name) => readFile(path.join(dir, "supabase/templates", `${name}.html`), "utf8");

export async function runAuthSetup({ env, fetchImpl, log, rootDir = root }) {
  const ref = env.SUPABASE_PROJECT_REF?.trim();
  if (!ref) {
    log.error("✗ SUPABASE_PROJECT_REF is required. Point it at an isolated Supabase project.");
    return 1;
  }

  const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const headers = { "Content-Type": "application/json" };
  if (env.SUPABASE_ACCESS_TOKEN) headers.Authorization = `Bearer ${env.SUPABASE_ACCESS_TOKEN}`;
  const patch = (label, body) => applyAuthPatch({ label, body, fetchImpl, api, headers, log });

  let smtpReady = false;
  let failed = false;
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
    if (!ok) failed = true;
    if (ok) {
      const confirmed = await patch("Require email confirmation", { mailer_autoconfirm: false });
      if (!confirmed) failed = true;
    }
  } else {
    log.log("– SMTP skipped (set RESEND_API_KEY or SMTP_PASS)");
  }

  if (smtpReady) {
    const templates = await patch("Email templates", {
      mailer_subjects_confirmation: "Confirm your MJFIRD client account",
      mailer_subjects_recovery: "Reset your MJFIRD password",
      mailer_subjects_magic_link: "Your MJFIRD sign-in link",
      mailer_subjects_email_change: "Confirm your new email — MJFIRD",
      mailer_templates_confirmation_content: await template(rootDir, "confirmation"),
      mailer_templates_recovery_content: await template(rootDir, "recovery"),
      mailer_templates_magic_link_content: await template(rootDir, "magic_link"),
      mailer_templates_email_change_content: await template(rootDir, "email_change"),
    });
    if (!templates) failed = true;
  } else {
    log.log("– Templates skipped (need SMTP first)");
  }

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    const google = await patch("Google provider", {
      external_google_enabled: true,
      external_google_client_id: env.GOOGLE_CLIENT_ID,
      external_google_secret: env.GOOGLE_CLIENT_SECRET,
    });
    if (!google) failed = true;
  } else {
    log.log("– Google skipped (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)");
  }

  return failed ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const code = await runAuthSetup({ env: process.env, fetchImpl: fetch, log: console });
  if (code !== 0) process.exitCode = code;
}
