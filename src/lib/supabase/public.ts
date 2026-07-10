import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cookie-free client for public, read-only data fetching. Unlike
// src/lib/supabase/server.ts (which reads request cookies for auth), this
// touches no dynamic APIs, so pages that only use it stay static/ISR-eligible
// instead of being forced into fully dynamic rendering on every request.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
