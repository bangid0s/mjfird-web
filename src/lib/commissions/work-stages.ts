import type { CommissionRequestRow } from "@/lib/supabase/types";

/*
  Work stages (0047_work_stages.sql): a progress marker for a commission
  while it's in progress. Previews and feedback happen in the client's
  Discord ticket; the site only shows where the order is. Rows may come
  from a database without the migration, so every field is optional and
  "no stages" simply hides the feature.
*/

export const DEFAULT_WORK_STAGES = ["Sketch", "Lineart", "Colour", "Final"];

export type WorkStages = {
  stages: string[];
  index: number;
  current: string;
  isLast: boolean;
};

export function workStagesOf(req: Pick<CommissionRequestRow, "status" | "work_stages" | "stage_index">): WorkStages | null {
  const stages = req.work_stages ?? [];
  if (req.status !== "in_progress" || stages.length === 0) return null;
  const index = Math.min(Math.max(req.stage_index ?? 0, 0), stages.length - 1);
  return { stages, index, current: stages[index], isLast: index === stages.length - 1 };
}

/** One stage name per line, trimmed, de-duplicated, at most 10 of up to 40 characters. */
export function parseWorkStages(raw: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split("\n")) {
    const name = line.trim().slice(0, 40);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === 10) break;
  }
  return out;
}
