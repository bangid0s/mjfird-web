import { createBrowserClient } from "@supabase/ssr";

// Untyped on purpose — see src/lib/supabase/types.ts for the row shapes used
// at each call site instead of fighting the generic Database constraint.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
