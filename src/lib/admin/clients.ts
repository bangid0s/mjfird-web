import { priceOf } from "@/lib/commissions/status";
import type { CommissionStatus } from "@/lib/supabase/types";

/*
  Admin → Clients. Every account that signed up (client_profiles, filled by the
  handle_new_user trigger) joined with its commission history. Kept free of
  Supabase and React so the list page, the detail page and the CSV export all
  count the same way, and so it can be tested on plain data.
*/

export type ClientProfile = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  region: string;
  discord: string;
  x_handle: string;
  social_url: string;
  created_at: string;
};

export type ClientOrder = {
  id: string;
  client_id: string;
  status: CommissionStatus;
  final_price: number | string | null;
  estimated_total: number | string;
  created_at: string;
};

export type ClientSummary = ClientProfile & {
  orders: number;
  /** Orders that reached in progress, delivered or completed. */
  paidOrders: number;
  /** Sum of paid orders, at the final price (else the estimate). */
  spent: number;
  lastOrderAt: string | null;
};

/** Money only counts once the client has paid, i.e. work has started. */
export const PAID_STATUSES: CommissionStatus[] = ["in_progress", "delivered", "completed"];

export function isPaid(status: CommissionStatus) {
  return PAID_STATUSES.includes(status);
}

export function summarizeClients(
  profiles: ClientProfile[],
  orders: ClientOrder[],
  excludeIds: Iterable<string> = [],
): ClientSummary[] {
  const skip = new Set(excludeIds);
  const byClient = new Map<string, ClientOrder[]>();
  for (const o of orders) {
    const list = byClient.get(o.client_id);
    if (list) list.push(o);
    else byClient.set(o.client_id, [o]);
  }
  return profiles
    .filter((p) => !skip.has(p.id))
    .map((p) => ({ ...p, ...orderStats(byClient.get(p.id) ?? []) }));
}

export function orderStats(orders: ClientOrder[]) {
  let paidOrders = 0;
  let spent = 0;
  let lastOrderAt: string | null = null;
  for (const o of orders) {
    if (isPaid(o.status)) {
      paidOrders += 1;
      spent += priceOf(o);
    }
    if (!lastOrderAt || o.created_at > lastOrderAt) lastOrderAt = o.created_at;
  }
  return { orders: orders.length, paidOrders, spent: Math.round(spent * 100) / 100, lastOrderAt };
}

// ---------- list filters ----------

export const CLIENT_FILTERS = [
  { value: "all", label: "All" },
  { value: "ordered", label: "Ordered" },
  { value: "paid", label: "Paid" },
  { value: "never", label: "Never ordered" },
] as const;
export type ClientFilter = (typeof CLIENT_FILTERS)[number]["value"];

export const CLIENT_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "orders", label: "Most orders" },
  { value: "spent", label: "Top spend" },
  { value: "recent", label: "Last order" },
] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number]["value"];

export function parseFilter(v: string | undefined): ClientFilter {
  return CLIENT_FILTERS.some((f) => f.value === v) ? (v as ClientFilter) : "all";
}

export function parseSort(v: string | undefined): ClientSort {
  return CLIENT_SORTS.some((s) => s.value === v) ? (v as ClientSort) : "newest";
}

export function matchesFilter(c: ClientSummary, filter: ClientFilter) {
  if (filter === "ordered") return c.orders > 0;
  if (filter === "paid") return c.paidOrders > 0;
  if (filter === "never") return c.orders === 0;
  return true;
}

export function matchesSearch(c: ClientSummary, q: string) {
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  if (!needle) return true;
  return [c.display_name, c.email, c.discord, c.x_handle, c.region].some((v) => v.toLowerCase().includes(needle));
}

export function sortClients(list: ClientSummary[], sort: ClientSort) {
  const byNewest = (a: ClientSummary, b: ClientSummary) => b.created_at.localeCompare(a.created_at);
  const sorted = [...list];
  sorted.sort((a, b) => {
    if (sort === "orders") return b.orders - a.orders || b.spent - a.spent || byNewest(a, b);
    if (sort === "spent") return b.spent - a.spent || b.orders - a.orders || byNewest(a, b);
    if (sort === "recent") return (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "") || byNewest(a, b);
    return byNewest(a, b);
  });
  return sorted;
}

export function selectClients(list: ClientSummary[], opts: { q?: string; filter?: ClientFilter; sort?: ClientSort }) {
  return sortClients(
    list.filter((c) => matchesFilter(c, opts.filter ?? "all") && matchesSearch(c, opts.q ?? "")),
    opts.sort ?? "newest",
  );
}

// ---------- CSV ----------

/*
  Names, Discord tags and links are typed by clients, so a cell starting with
  = + - @ (or a tab / carriage return) could run as a formula when the file is
  opened in Excel or Sheets. Those get a leading apostrophe, which spreadsheets
  show as plain text.
*/
export function csvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_COLUMNS: [string, (c: ClientSummary) => string | number | null][] = [
  ["Name", (c) => c.display_name],
  ["Email", (c) => c.email],
  ["Region", (c) => c.region],
  ["Discord", (c) => c.discord],
  ["X", (c) => (c.x_handle ? `https://x.com/${c.x_handle}` : "")],
  ["Other link", (c) => c.social_url],
  ["Joined", (c) => c.created_at.slice(0, 10)],
  ["Orders", (c) => c.orders],
  ["Paid orders", (c) => c.paidOrders],
  ["Total spent (USD)", (c) => c.spent.toFixed(2)],
  ["Last order", (c) => c.lastOrderAt?.slice(0, 10) ?? ""],
];

/** CRLF line endings and a BOM so Excel opens accents and emoji correctly. */
export function clientsToCsv(list: ClientSummary[]) {
  const lines = [CSV_COLUMNS.map(([h]) => csvCell(h)).join(",")];
  for (const c of list) lines.push(CSV_COLUMNS.map(([, get]) => csvCell(get(c))).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
