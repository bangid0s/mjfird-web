import { createClient } from "@/lib/supabase/server";
import { clientFileName } from "@/lib/commissions/client-files";
import { createZipStream, uniqueZipNames, type ZipEntry } from "@/lib/zip";
import type { CommissionRequestRow } from "@/lib/supabase/types";

/*
  GET /admin/requests/<id>/files?kind=references|deliveries|all
  Every file of that kind on the request, as one ZIP. Files are pulled from
  storage one at a time and streamed out, so big reference packs work too.
*/

const KINDS = ["references", "deliveries", "all"] as const;
type Kind = (typeof KINDS)[number];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kindParam = new URL(request.url).searchParams.get("kind") ?? "references";
  const kind: Kind = (KINDS as readonly string[]).includes(kindParam) ? (kindParam as Kind) : "references";

  const supabase = await createClient();
  // The proxy already keeps non-admins out of /admin; check again since this
  // hands out private client files.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Not allowed.", { status: 403 });

  const { data } = await supabase
    .from("commission_requests")
    .select("ref, reference_paths, delivery_paths")
    .eq("id", id)
    .maybeSingle();
  if (!data) return new Response("Request not found.", { status: 404 });
  const req = data as Pick<CommissionRequestRow, "ref" | "reference_paths" | "delivery_paths">;

  const groups: { folder: string; paths: string[] }[] = [];
  if (kind !== "deliveries") groups.push({ folder: kind === "all" ? "references/" : "", paths: req.reference_paths });
  if (kind !== "references") groups.push({ folder: kind === "all" ? "deliveries/" : "", paths: req.delivery_paths });

  const files = groups.flatMap(({ folder, paths }) => {
    const names = uniqueZipNames(paths.map(clientFileName));
    return paths.map((path, i) => ({ path, name: folder + names[i] }));
  });
  if (files.length === 0) return new Response("No files to download.", { status: 404 });

  const bucket = supabase.storage.from("commissions");
  async function* entries(): AsyncGenerator<ZipEntry | null> {
    for (const file of files) {
      const { data: blob, error } = await bucket.download(file.path);
      // A file deleted from storage but still listed on the request: skip it.
      yield error || !blob ? null : { name: file.name, data: new Uint8Array(await blob.arrayBuffer()) };
    }
  }

  const label = kind === "all" ? "files" : kind;
  const filename = `request-${String(req.ref).replace(/[^a-zA-Z0-9_-]+/g, "")}-${label}.zip`;
  return new Response(createZipStream(entries()), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
