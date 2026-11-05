"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/session";

export type AuthState = { error?: string; message?: string } | undefined;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mjfird.com");
}

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered")) return "There's already an account with that email. Try signing in instead.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("password")) return message;
  return "Something went wrong. Please try again.";
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=google&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

const signInSchema = z.object({
  email: z.string().trim().email("That email doesn't look right."),
  password: z.string().min(1, "Enter your password."),
});

export async function signInWithEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyAuthError(error.message) };

  redirect(safeNext(String(formData.get("next") ?? "")));
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell me your name.").max(120),
  email: z.string().trim().email("That email doesn't look right."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(72),
});

export async function signUpWithEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const next = safeNext(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) {
    return { message: `Almost there — I've sent a confirmation link to ${parsed.data.email}.` };
  }
  redirect(next);
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "That email doesn't look right." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await origin()}/auth/callback?next=/account/password`,
  });
  // Same answer whether or not the account exists.
  return { message: "If there's an account for that email, a reset link is on its way." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = z.string().min(8).max(72).safeParse(formData.get("password"));
  if (!password.success) return { error: "Use at least 8 characters for your password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: friendlyAuthError(error.message) };
  return { message: "Password updated." };
}

export async function signOutClient() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
