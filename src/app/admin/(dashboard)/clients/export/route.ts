import { createClient } from "@/lib/supabase/server";
import { loadClientSummaries } from "@/lib/admin/clients-data";
import { clientsToCsv, parseFilter, parseSort, selectClients } from "@/lib/admin/clients";

/*
  GET /admin/clients/export?q=&filter=&sort=
  The client list as a CSV, with the same search, filter and sort as the page,
  so "Export" always downloads what's on screen.
*/
export async function GET(request: Request) {
  const supabase = await createClient();
  // The proxy already keeps non-admins out of /admin; check again since this
  // hands out every client's email address.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Not allowed.", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const rows = selectClients(await loadClientSummaries(supabase), {
    q: (sp.get("q") ?? "").slice(0, 100),
    filter: parseFilter(sp.get("filter") ?? undefined),
    sort: parseSort(sp.get("sort") ?? undefined),
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(clientsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mjfird-clients-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
