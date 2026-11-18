"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/data/config";
import { badgeLabel, safeHref, timeAgo } from "@/lib/notifications/format";
import { easeFreeze } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { NotificationRow } from "@/lib/supabase/types";

/*
  The bell in the nav. Like AccountLink it reads the session in the browser,
  so public pages stay static. Rows are written by database triggers
  (supabase/migrations/0044_notifications.sql); this only reads them and
  marks them read.

  It stays fresh three ways: a Realtime subscription when the table is in the
  supabase_realtime publication, a refetch on every route change, and a
  refetch when the tab comes back into focus.

  If the migration hasn't been run yet the query fails and the bell simply
  doesn't render.
*/

type Item = Pick<NotificationRow, "id" | "kind" | "title" | "body" | "href" | "read_at" | "created_at">;

const LIMIT = 20;

export default function NotificationBell({
  className,
  allHref = "/account",
  align = "right",
}: {
  className?: string;
  /** Where "See all" points: the client's requests, or the admin queue. */
  allHref?: string;
  align?: "left" | "right";
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const pathname = usePathname();
  const panelId = useId();

  const client = () => {
    supabaseRef.current ??= createClient();
    return supabaseRef.current;
  };

  // Who is signed in.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = client();
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      setUserId(next);
      // Signing out (or switching accounts) must not leave the last inbox on screen.
      if (!next) {
        setItems([]);
        setUnread(0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const supabase = client();
    const [list, count] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, kind, title, body, href, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    if (list.error) {
      setAvailable(false);
      return;
    }
    setAvailable(true);
    setItems((list.data as Item[]) ?? []);
    setUnread(count.count ?? (list.data as Item[]).filter((n) => !n.read_at).length);
    setNow(Date.now());
  }, [userId]);

  // Initial load, and again after every navigation (opening a request page
  // marks its notifications read on the server).
  useEffect(() => {
    if (userId) void load();
  }, [userId, pathname, load]);

  // Live updates + focus refetch.
  useEffect(() => {
    if (!userId) return;
    const supabase = client();
    // The browser client is a singleton and `.channel(topic)` hands back an
    // existing channel with the same topic. The admin shell mounts two bells
    // (mobile bar + desktop header), so a shared topic made the second
    // `.on()` throw "cannot add postgres_changes callbacks after subscribe()"
    // and took the whole page down. Each bell gets its own topic, and a
    // Realtime failure only costs live updates, never the page.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`notifications:${userId}:${panelId.replace(/[^a-zA-Z0-9_-]/g, "")}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => void load(),
        )
        .subscribe();
    } catch (err) {
      console.error("Notification bell: live updates unavailable", err);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, load, panelId]);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A route change closes the panel (render-time adjust, as in Nav).
  const [panelRoute, setPanelRoute] = useState(pathname);
  if (panelRoute !== pathname) {
    setPanelRoute(pathname);
    setOpen(false);
  }

  async function markRead(ids: string[] | null) {
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((n) => (!n.read_at && (!ids || ids.includes(n.id)) ? { ...n, read_at: stamp } : n)));
    setUnread((prev) => (ids ? Math.max(0, prev - ids.length) : 0));
    await client().rpc("mark_notifications_read", { p_ids: ids, p_request_id: null });
  }

  if (!isSupabaseConfigured || !userId || !available) return null;

  const badge = badgeLabel(unread);
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        data-cursor="view"
        onClick={() => {
          setOpen((v) => !v);
          setNow(Date.now());
        }}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center text-ink-muted transition-colors duration-[var(--duration-fast)] hover:bg-bg-raised-2 hover:text-ink",
          open && "bg-bg-raised-2 text-ink",
        )}
      >
        <BellIcon className="h-[18px] w-[18px]" />
        {badge && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-ink tabular-nums"
          >
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: easeFreeze }}
            className={cn(
              // Full width under the bar on phones, a dropdown from sm up.
              "fixed inset-x-4 top-[calc(var(--nav-h,3.5rem)+0.5rem)] z-[var(--z-modal)] flex max-h-[min(32rem,75svh)] flex-col border border-line bg-bg shadow-[0_18px_50px_-20px_rgba(0,0,0,0.45)]",
              "sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-[22rem]",
              align === "right" ? "sm:right-0" : "sm:left-0",
            )}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
              <p className="text-body-sm font-semibold text-ink">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markRead(null)}
                  className="text-body-sm text-ink-muted transition-colors hover:text-accent"
                >
                  Mark all read
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-body-sm text-pretty text-ink-muted">
                Nothing yet. Updates on your orders and messages will show up here.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {items.map((n) => (
                  <li key={n.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={safeHref(n.href)}
                      onClick={() => {
                        setOpen(false);
                        if (!n.read_at) void markRead([n.id]);
                      }}
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors hover:bg-bg-raised",
                        !n.read_at && "bg-accent-soft/60",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent")}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-body-sm text-ink", !n.read_at && "font-semibold")}>
                          {!n.read_at && <span className="sr-only">Unread: </span>}
                          {n.title}
                        </span>
                        {n.body && <span className="line-clamp-2 text-body-sm text-ink-muted">{n.body}</span>}
                        <span className="mono-meta text-ink-faint">{timeAgo(n.created_at, now)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href={allHref}
              onClick={() => setOpen(false)}
              className="border-t border-line px-4 py-3 text-center text-body-sm text-ink-muted transition-colors hover:text-accent"
            >
              {allHref.startsWith("/admin") ? "Open requests →" : "View my requests →"}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
