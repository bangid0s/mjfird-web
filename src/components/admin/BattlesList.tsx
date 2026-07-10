"use client";

import { updateBattle, deleteBattle, reorderBattles } from "@/lib/admin/dance-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import type { BattleRow } from "@/lib/supabase/types";

export default function BattlesList({ battles }: { battles: BattleRow[] }) {
  return (
    <ReorderableList
      items={battles}
      onReorder={reorderBattles}
      renderRow={(item) => (
        <div className="flex items-center gap-3">
          <form
            action={updateBattle.bind(null, item.id)}
            className="grid flex-1 grid-cols-[100px_1fr_1fr_auto] items-center gap-3"
          >
            <input name="year" defaultValue={item.year} className={fieldInputClasses} />
            <input name="event" defaultValue={item.event} className={fieldInputClasses} />
            <input name="result" defaultValue={item.result ?? ""} className={fieldInputClasses} />
            <button
              type="submit"
              className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
            >
              Save
            </button>
          </form>
          <DeleteButton action={deleteBattle.bind(null, item.id)} />
        </div>
      )}
    />
  );
}
