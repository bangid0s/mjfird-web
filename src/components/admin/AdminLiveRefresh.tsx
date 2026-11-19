"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/data/config";

/*
  Keeps the request screens current without a manual reload. When a client
  sends a request, pays, cancels, writes a message or leaves a review, the
  database adds a notification for the admin (0044_notifications.sql). That
  table is already on Supabase Realtime, so listening to it tells us
  something changed and the page re-fetches its data in place. Typed text and
  open forms survive: router.refresh() keeps client state.

  Coming back to the tab after a while also refreshes, which covers the
  moments Realtime was asleep (laptop lid closed, phone in a pocket).
*/

const LIVE_PATHS = (path: string) => path === "/admin" || path.startsWith("/admin/requests");
const STALE_AFTER_MS = 30_000;

export default function AdminLiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let timer: number | undefined;
    let hiddenAt: number | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const refreshSoon = () => {
      if (!LIVE_PATHS(pathRef.current)) return;
      window.clearTimeout(timer);
      // Several rows can land at once (a payment notifies twice); refresh once.
      timer = window.setTimeout(() => router.refresh(), 400);
    };

    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (!userId || cancelled) return;
      try {
        channel = supabase
          .channel(`admin-live:${userId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
            refreshSoon,
          )
          .subscribe();
      } catch (err) {
        console.error("Admin live refresh unavailable", err);
      }
    });

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt > STALE_AFTER_MS) {
        hiddenAt = null;
        refreshSoon();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
