import type { SupabaseClient } from "@supabase/supabase-js";

/** Signed, short-lived links to private files in the `commissions` bucket. */
export async function signFiles(supabase: SupabaseClient, paths: string[]): Promise<{ url: string; name: string; path: string }[]> {
  if (paths.length === 0) return [];
  const { data } = await supabase.storage.from("commissions").createSignedUrls(paths, 60 * 60);
  return (data ?? [])
    .filter((d): d is typeof d & { signedUrl: string } => Boolean(d.signedUrl))
    .map((d) => ({ url: d.signedUrl, path: d.path ?? "", name: (d.path ?? "").split("/").pop()?.replace(/^\d+-[a-z0-9]+-/, "") ?? "file" }));
}

const IMAGE = /\.(png|jpe?g|webp|gif)$/i;

export default function FileLinks({ files }: { files: { url: string; name: string }[] }) {
  if (files.length === 0) return <p className="text-body-sm text-ink-faint">None.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {files.map((f) => (
        <li key={f.url}>
          <a href={f.url} target="_blank" rel="noreferrer" className="group flex flex-col gap-2">
            <span className="relative block aspect-square overflow-hidden border border-line bg-bg-raised-2">
              {IMAGE.test(f.name) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
              ) : (
                <span className="mono-meta absolute inset-0 grid place-items-center">{f.name.split(".").pop()}</span>
              )}
            </span>
            <span className="truncate text-[13px] text-ink-muted group-hover:text-accent">{f.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
