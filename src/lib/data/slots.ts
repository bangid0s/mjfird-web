import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "./config";
import { slotState, type SlotState } from "@/lib/slots";
import type { Availability } from "@/lib/services/storefront";

/** Capacity and orders in hand, or null before migration 0056 / without Supabase. */
export async function getSlotCounts(): Promise<{ total: number | null; taken: number } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await createPublicClient().rpc("commission_slots");
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return null;
    return { total: row.total ?? null, taken: Number(row.taken ?? 0) };
  } catch {
    return null;
  }
}

export async function getSlotState(): Promise<SlotState> {
  return slotState(await getSlotCounts());
}

/**
 * A full queue puts every open service on the waitlist, so its badge, order
 * panel and request form all say so (the database marks the request itself).
 */
export function withMonthlyCap<T extends { availability: Availability }>(service: T, state: SlotState): T {
  return state.kind === "full" && service.availability === "open" ? { ...service, availability: "waitlist" } : service;
}
