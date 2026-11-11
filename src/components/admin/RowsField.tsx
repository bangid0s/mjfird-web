"use client";

import { useRef, useState, type CSSProperties } from "react";
import { fieldInputClasses } from "@/components/admin/Field";
import { cn } from "@/lib/cn";

export type RowColumn = {
  label: string;
  placeholder?: string;
  /** Grid track on wide screens, e.g. "6rem" or "2fr". Defaults to "1fr". */
  width?: string;
  /** A short textarea instead of a one-line input, for sentences. */
  multiline?: boolean;
};

type Row = { id: number; cells: string[] };

/**
 * Serialises rows the way the settings parsers read them: one row per line,
 * cells joined with "|". A pipe typed into any cell but the last would shift
 * every cell after it, and a line break would split the row in two, so both
 * are replaced before joining.
 */
export function serialiseRows(rows: string[][]): string {
  return rows
    .map((cells) => cells.map((cell) => cell.replace(/\s*\n\s*/g, " ").trim()))
    .filter((cells) => cells.some(Boolean))
    .map((cells) => cells.map((cell, i) => (i < cells.length - 1 ? cell.replace(/\|/g, "/") : cell)).join("|"))
    .join("\n");
}

/**
 * A small table editor for the repeating bits of page copy: stats, timeline
 * entries, process steps, FAQ, menu links, tag lists.
 *
 * These used to be a textarea where each line had to be typed as
 * "value|suffix|label". The form still posts exactly that text in one hidden
 * field, so the server side is unchanged, but the admin fills in labelled
 * boxes and never has to know the format.
 */
export default function RowsField({
  name,
  label,
  hint,
  columns,
  initial,
  addLabel = "Add row",
}: {
  name: string;
  label: string;
  hint?: string;
  columns: RowColumn[];
  initial: string[][];
  addLabel?: string;
}) {
  const nextId = useRef(initial.length);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((cells, id) => ({ id, cells: columns.map((_, i) => cells[i] ?? "") })),
  );

  const update = (id: number, index: number, value: string) =>
    setRows((list) =>
      list.map((row) => (row.id === id ? { ...row, cells: row.cells.map((c, i) => (i === index ? value : c)) } : row)),
    );
  const remove = (id: number) => setRows((list) => list.filter((row) => row.id !== id));
  const add = () => setRows((list) => [...list, { id: nextId.current++, cells: columns.map(() => "") }]);
  const move = (index: number, by: -1 | 1) =>
    setRows((list) => {
      const target = index + by;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const tracks = { "--tracks": `${columns.map((c) => c.width ?? "1fr").join(" ")} auto` } as CSSProperties;
  const grid = "grid gap-2 sm:[grid-template-columns:var(--tracks)] sm:items-start";
  const iconButton =
    "grid h-9 w-9 shrink-0 place-items-center border border-line text-ink-muted transition-colors duration-[var(--duration-fast)] hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 flex flex-col gap-0.5">
        <span className="text-body-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-[13px] leading-snug text-ink-faint">{hint}</span>}
      </legend>
      <input type="hidden" name={name} value={serialiseRows(rows.map((row) => row.cells))} />

      {rows.length > 0 && columns.length > 1 && (
        <div className={cn(grid, "hidden sm:grid")} style={tracks} aria-hidden="true">
          {columns.map((column) => (
            <span key={column.label} className="text-[13px] text-ink-faint">
              {column.label}
            </span>
          ))}
          {/* Holds the width of the row controls so the headings line up. */}
          <span className="w-[7.25rem]" />
        </div>
      )}

      {rows.length === 0 && (
        <p className="border border-dashed border-line px-3.5 py-3 text-body-sm text-ink-faint">Nothing here yet.</p>
      )}

      <ol className="flex flex-col gap-3 sm:gap-2">
        {rows.map((row, index) => (
          <li key={row.id} className={cn(grid, "border-b border-line pb-3 sm:border-0 sm:pb-0")} style={tracks}>
            {columns.map((column, i) => {
              const shared = {
                value: row.cells[i],
                placeholder: column.placeholder ?? column.label,
                "aria-label": `${column.label}, row ${index + 1}`,
                onChange: (e: { target: { value: string } }) => update(row.id, i, e.target.value),
                className: cn(fieldInputClasses, "min-w-0"),
              };
              return column.multiline ? (
                <textarea key={column.label} rows={2} {...shared} className={cn(shared.className, "resize-y")} />
              ) : (
                <input key={column.label} {...shared} />
              );
            })}
            <span className="flex gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move row ${index + 1} up`} className={iconButton}>
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Move row ${index + 1} down`} className={iconButton}>
                ↓
              </button>
              <button type="button" onClick={() => remove(row.id)} aria-label={`Remove row ${index + 1}`} className={cn(iconButton, "hover:border-error hover:text-error")}>
                ×
              </button>
            </span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex h-9 items-center gap-2 self-start border border-line-strong px-3 text-body-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:border-ink"
      >
        <span aria-hidden="true">+</span>
        {addLabel}
      </button>
    </fieldset>
  );
}
