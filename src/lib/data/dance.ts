import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { DanceMediaRow, BattleRow } from "@/lib/supabase/types";

export type DanceMedia = { kind: "video" | "photo"; url: string; caption: string };
export type Battle = { year: string; event: string; result: string };

const placeholderMedia: DanceMedia[] = Array.from({ length: 8 }).map((_, i) => ({
  kind: "photo" as const,
  url: "",
  caption: `Still ${i + 1}`,
}));

const placeholderBattles: Battle[] = [
  { year: "2025", event: "Undercut Sessions Vol. 12", result: "1st — 2v2" },
  { year: "2024", event: "KL Winter Cypher", result: "Finalist — 1v1" },
  { year: "2023", event: "Regional Throwdown", result: "1st — Crew" },
  { year: "2022", event: "Undercut Sessions Vol. 3", result: "2nd — 1v1" },
];

export async function getDanceMedia(): Promise<DanceMedia[]> {
  if (!isSupabaseConfigured) return placeholderMedia;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("dance_media")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderMedia;
    return data.map((row: DanceMediaRow) => ({
      kind: row.kind,
      url: row.url,
      caption: row.caption ?? "",
    }));
  } catch {
    return placeholderMedia;
  }
}

export async function getBattles(): Promise<Battle[]> {
  if (!isSupabaseConfigured) return placeholderBattles;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("battles")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderBattles;
    return data.map((row: BattleRow) => ({
      year: row.year,
      event: row.event,
      result: row.result ?? "",
    }));
  } catch {
    return placeholderBattles;
  }
}
