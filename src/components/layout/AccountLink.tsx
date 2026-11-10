"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/data/config";
import { cn } from "@/lib/cn";

/*
  Checked in the browser rather than on the server, so every public page can
  stay statically rendered — reading the session server-side would make the
  whole site dynamic just to swap one word in the nav.
*/
export default function AccountLink({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return null;

  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      onClick={onNavigate}
      className={cn("label text-ink-muted transition-colors hover:text-ink", signedIn === null && "opacity-0", className)}
    >
      {signedIn ? "Account" : "Sign in"}
    </Link>
  );
}
