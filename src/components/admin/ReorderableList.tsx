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
    setList(items);
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...list];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setList(next);
    setDragIndex(null);
    onReorder(next.map((item) => item.id));
  };

  return (
    <div className="flex flex-col">
      {list.map((item, i) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
          className={cn(
            "flex items-center gap-3 border-t border-line px-2 py-3 transition-colors last:border-b hover:bg-bg-raised/40",
            dragIndex === i && "opacity-40",
          )}
        >
          <span
            className="cursor-grab select-none font-mono text-ink-faint active:cursor-grabbing"
            aria-hidden="true"
          >
            ⠿
          </span>
          <div className="flex-1">{renderRow(item)}</div>
        </div>
      ))}
    </div>
  );
}
