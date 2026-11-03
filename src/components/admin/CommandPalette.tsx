"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_CREATE_ACTIONS, ADMIN_NAV, type AdminNavItem } from "@/components/admin/admin-nav";
import { ExternalIcon, SearchIcon } from "@/components/admin/AdminIcons";

type Command = AdminNavItem & { section: string; external?: boolean };

const COMMANDS: Command[] = [
  ...ADMIN_CREATE_ACTIONS.map((item) => ({ ...item, section: "Create" })),
  ...ADMIN_NAV.flatMap((group) => group.items.map((item) => ({ ...item, section: group.label }))),
  { href: "/", label: "Open the live site", icon: ExternalIcon, section: "Site", external: true, keywords: "view preview public" },
];

function matches(command: Command, query: string) {
  if (!query) return true;
  const haystack = `${command.label} ${command.section} ${command.keywords ?? ""}`.toLowerCase();
  // Every word typed has to appear somewhere — "new post" finds "New blog post".
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * ⌘K / Ctrl+K jump-to-anything. Thirteen sidebar entries is past the point
 * where scanning a list is faster than typing three letters.
 */
export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Fresh state each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const results = useMemo(() => COMMANDS.filter((c) => matches(c, query)), [query]);
  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (command: Command | undefined) => {
    if (!command) return;
    onOpenChange(false);
    if (command.external) window.open(command.href, "_blank", "noopener,noreferrer");
    else router.push(command.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((active + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((active - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm motion-safe:animate-[page-enter_160ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to"
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden border border-line-strong bg-bg-raised shadow-[var(--shadow-lg)]"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Jump to a page or create something…"
            aria-label="Search admin"
            aria-controls="command-results"
            aria-activedescendant={results[active] ? `command-${active}` : undefined}
            className="h-14 w-full bg-transparent text-body text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <kbd className="hidden shrink-0 border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:block">
            ESC
          </kbd>
        </div>

        <ul id="command-results" ref={listRef} role="listbox" className="overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-10 text-center text-body-sm text-ink-muted">
              Nothing matches “{query}”.
            </li>
          )}
          {results.map((command, i) => {
            const showSection = i === 0 || results[i - 1].section !== command.section;
            const Icon = command.icon;
            return (
              <li key={command.href + command.label} role="presentation">
                {showSection && (
                  <p className="px-3 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint first:pt-1">
                    {command.section}
                  </p>
                )}
                <button
                  type="button"
                  id={`command-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setCursor(i)}
                  onClick={() => run(command)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-body-sm transition-colors",
                    i === active ? "bg-accent-soft text-ink" : "text-ink-muted",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", i === active ? "text-accent" : "text-ink-faint")} />
                  <span className="flex-1">{command.label}</span>
                  {i === active && (
                    <span aria-hidden="true" className="font-mono text-[10px] text-ink-faint">
                      ↵
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-faint">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span className="ml-auto"><kbd className="font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
