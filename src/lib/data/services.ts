import { createPublicClient } from "@/lib/supabase/public";
import { services as placeholderServices, type Service } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "./config";
import type { ServiceRow } from "@/lib/supabase/types";

function mapRow(row: ServiceRow): Service {
  return {
    title: row.title,
    description: row.description ?? "",
    deliverables: row.deliverables ?? [],
  };
}

export async function getServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) return placeholderServices;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderServices;
    return data.map(mapRow);
  } catch {
    return placeholderServices;
  }
}
