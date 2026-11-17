import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/session";
import { discordIdentityOf } from "@/lib/discord/perks";
import { syncDiscordLink } from "@/lib/discord/sync";

// Lands here from Google sign-in, Discord linking, email confirmation, and password reset links.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const linkingDiscord = searchParams.get("link") === "discord";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!linkingDiscord) return NextResponse.redirect(new URL(next, origin));
      // Ask the auth server for the user so the identity list includes the new link.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const identity = discordIdentityOf(user);
      const synced = identity && user ? await syncDiscordLink(user.id, identity) : null;
      const profile = new URL("/account/profile", origin);
      profile.searchParams.set("discord", !identity ? "error" : synced?.ok ? "linked" : "sync_failed");
      return NextResponse.redirect(profile);
    }
  }

  if (linkingDiscord) {
    // Typically: that Discord account is already linked to another website account,
    // or the person pressed Cancel on Discord's screen.
    const profile = new URL("/account/profile", origin);
    const description = (searchParams.get("error_description") ?? "").toLowerCase();
    profile.searchParams.set("discord", description.includes("already") ? "taken" : "cancelled");
    return NextResponse.redirect(profile);
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "link");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
