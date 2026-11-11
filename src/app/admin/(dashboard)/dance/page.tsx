import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createMedia, createBattle } from "@/lib/admin/dance-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import DanceMediaList from "@/components/admin/DanceMediaList";
import BattlesList from "@/components/admin/BattlesList";
import PageHeader from "@/components/admin/PageHeader";
import UploadInput from "@/components/admin/UploadInput";
import type { DanceMediaRow, BattleRow } from "@/lib/supabase/types";

export default async function AdminDancePage() {
  const supabase = await createClient();
  const [{ data: media }, { data: battles }] = await Promise.all([
    supabase.from("dance_media").select("*").order("sort_order", { ascending: true }),
    supabase.from("battles").select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-16">
      <section>
        <PageHeader
          title="Dance media"
          description={
            <>
              The reel, stills and battle record shown on /dance. Add rows below, edit inline, drag to reorder.
              The page&rsquo;s heading and intro are under{" "}
              <Link href="/admin/pages/dance" className="font-medium text-ink underline underline-offset-4">
                Dance page
              </Link>
              .
            </>
          }
        />
        <h2 className="mb-6 text-body font-semibold text-ink">Media</h2>

        <form action={createMedia} className="mb-8 grid grid-cols-[100px_1fr_1fr_100px_auto] items-end gap-3">
          <select name="kind" defaultValue="photo" className={fieldInputClasses}>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
          </select>
          <UploadInput
            name="url"
            ariaLabel="URL"
            placeholder="Drop an image here, paste a URL, or a YouTube link"
          />
          <input name="caption" placeholder="Caption" className={fieldInputClasses} />
          <select name="status" defaultValue="draft" className={fieldInputClasses}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button
            type="submit"
            className="bg-accent px-4 py-3 text-body-sm font-medium text-accent-ink"
          >
            Add
          </button>
        </form>

        <DanceMediaList media={(media as DanceMediaRow[]) ?? []} />
      </section>

      <section>
        <h2 className="mb-6 text-body font-semibold text-ink">Battle record</h2>

        <form action={createBattle} className="mb-8 grid grid-cols-[100px_1fr_1fr_auto] items-end gap-3">
          <input name="year" placeholder="2026" className={fieldInputClasses} />
          <input name="event" placeholder="Event name" className={fieldInputClasses} />
          <input name="result" placeholder="1st — 2v2" className={fieldInputClasses} />
          <button
            type="submit"
            className="bg-accent px-4 py-3 text-body-sm font-medium text-accent-ink"
          >
            Add
          </button>
        </form>

        <BattlesList battles={(battles as BattleRow[]) ?? []} />
      </section>
    </div>
  );
}
