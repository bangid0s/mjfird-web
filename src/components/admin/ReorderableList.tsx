"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export default function ReorderableList<T extends { id: string }>({
  items,
  onReorder,
  renderRow,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderRow: (item: T) => React.ReactNode;
}) {
  const [list, setList] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (list.length !== items.length || list.some((item, i) => item.id !== items[i]?.id)) {
    // Server data changed under us (create/delete elsewhere) — resync.
    // Rows below always render the latest item data (e.g. a status change).
    setList(items);
  }

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setList(next);
    onReorder(next.map((item) => item.id));
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null) return;
    move(dragIndex, targetIndex);
    setDragIndex(null);
  };

  // HTML drag-and-drop never fires on touch screens and can't be driven from
  // a keyboard, so every row also gets explicit up/down controls.
  const stepButton =
    "grid h-6 w-6 place-items-center text-ink-faint transition-colors hover:bg-bg-raised-2 hover:text-ink disabled:pointer-events-none disabled:opacity-25";

  return (
    <div className="flex flex-col border border-line bg-bg-raised/30">
      {list.map((item, i) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDragEnd={() => setDragIndex(null)}
          onDrop={() => handleDrop(i)}
          className={cn(
            "group/row flex items-center gap-3 border-t border-line px-3 py-3 transition-colors first:border-t-0 hover:bg-bg-raised",
            dragIndex === i && "opacity-40",
          )}
        >
          <div className="flex shrink-0 items-center gap-1">
            <span
              className="hidden cursor-grab select-none px-1 font-mono text-ink-faint active:cursor-grabbing sm:block"
              aria-hidden="true"
              title="Drag to reorder"
            >
              ⠿
            </span>
            <div className="flex flex-col">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} className={stepButton}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
              </button>
              <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, i + 1)} className={stepButton}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </div>
          </div>
          <div className="min-w-0 flex-1">{renderRow(items.find((fresh) => fresh.id === item.id) ?? item)}</div>
        </div>
      ))}
    </div>
  );
}
