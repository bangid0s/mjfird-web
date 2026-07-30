import type { SupabaseClient } from "@supabase/supabase-js";

// Every table that can hold a media URL. Rows are matched as whole JSON
// documents rather than column by column, so URLs buried in jsonb — project
// galleries, hero slider lists, blog bodies, partner logos — are covered too.
const MEDIA_TABLES = [
  "projects",
  "services",
  "testimonials",
  "blog_posts",
  "dance_media",
  "profile",
  "site_settings",
  "link_page_items",
];

type Row = Record<string, unknown> & { id: string };

function occurrences(haystack: string, needle: string) {
  return needle ? haystack.split(needle).length - 1 : 0;
}

/** How many times each URL is referenced across the site's content. */
export async function countMediaReferences(
  supabase: SupabaseClient,
  urls: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(urls.map((url) => [url, 0]));
  if (urls.length === 0) return counts;

  for (const table of MEDIA_TABLES) {
    const { data } = await supabase.from(table).select("*");
    if (!data?.length) continue;
    const blob = JSON.stringify(data);
    for (const url of urls) counts[url] += occurrences(blob, url);
  }

  return counts;
}

/**
 * Points every reference to `oldUrl` at `newUrl`. Without this a rename would
 * silently break each page using the file. Returns the number of rows touched.
 */
export async function rewriteMediaReferences(
  supabase: SupabaseClient,
  oldUrl: string,
  newUrl: string,
): Promise<number> {
  if (!oldUrl || oldUrl === newUrl) return 0;
  let updated = 0;

  for (const table of MEDIA_TABLES) {
    const { data } = await supabase.from(table).select("*");
    if (!data?.length) continue;

    for (const row of data as Row[]) {
      const json = JSON.stringify(row);
      if (!json.includes(oldUrl)) continue;

      const next = JSON.parse(json.split(oldUrl).join(newUrl)) as Row;
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(next)) {
        if (key === "id") continue;
        if (JSON.stringify(value) !== JSON.stringify(row[key])) patch[key] = value;
      }
      if (Object.keys(patch).length === 0) continue;

      const { error } = await supabase.from(table).update(patch).eq("id", row.id);
      if (!error) updated++;
    }
  }

  return updated;
}
