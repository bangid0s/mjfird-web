import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import type { ResumeEntryKind, ResumeEntryRow } from "@/lib/supabase/types";

export type ResumeEntry = {
  kind: ResumeEntryKind;
  role: string;
  organization: string;
  period: string;
  location: string;
  summary: string;
  bullets: string[];
};

export const RESUME_KINDS: { value: ResumeEntryKind; label: string; heading: string }[] = [
  { value: "experience", label: "Experience", heading: "Experience" },
  { value: "education", label: "Education", heading: "Education" },
  { value: "award", label: "Award", heading: "Awards & recognition" },
];

export function parseResumeKind(value: string | null | undefined): ResumeEntryKind {
  return RESUME_KINDS.some((kind) => kind.value === value)
    ? (value as ResumeEntryKind)
    : "experience";
}

const placeholderEntries: ResumeEntry[] = [
  {
    kind: "experience",
    role: "Independent designer & developer",
    organization: "MJFIRD Studio",
    period: "2021 — Present",
    location: "Remote",
    summary: "Brand systems and websites for clothing labels, venues and independent artists.",
    bullets: [
      "Design and build end-to-end: identity, art direction, then the site that carries it.",
      "Shipped 40+ projects across merch, editorial and motion work.",
    ],
  },
  {
    kind: "experience",
    role: "Art director",
    organization: "Freelance",
    period: "2018 — 2021",
    location: "Jakarta",
    summary: "Campaign art direction for streetwear and music clients.",
    bullets: [],
  },
  {
    kind: "education",
    role: "Visual Communication Design",
    organization: "Universitas",
    period: "2014 — 2018",
    location: "",
    summary: "",
    bullets: [],
  },
];

export async function getResumeEntries(): Promise<ResumeEntry[]> {
  if (!isSupabaseConfigured) return placeholderEntries;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("resume_entries")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderEntries;
    return (data as ResumeEntryRow[]).map((row) => ({
      kind: parseResumeKind(row.kind),
      role: row.role,
      organization: row.organization ?? "",
      period: row.period ?? "",
      location: row.location ?? "",
      summary: row.summary ?? "",
      bullets: row.bullets ?? [],
    }));
  } catch {
    return placeholderEntries;
  }
}
