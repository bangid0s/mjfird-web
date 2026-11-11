"use client";

import { useState } from "react";
import { fieldInputClasses } from "@/components/admin/Field";
import {
  QUESTION_TYPES,
  newId,
  type QuestionType,
  type ServiceAddon,
  type ServiceFaq,
  type ServiceLicense,
  MAX_EXTRA_CHARACTERS,
  type ServicePackage,
  type ServiceQuestion,
} from "@/lib/services/storefront";
import { cn } from "@/lib/cn";

/*
  Repeatable editors for the service storefront. Each keeps its list in state
  and posts it back as JSON in one hidden field; the server action re-validates
  every entry (src/lib/services/storefront.ts), so nothing here is trusted.
*/

const small = "text-[13px] font-medium text-ink-muted";
const iconBtn =
  "border border-line px-2 py-1 font-mono text-label text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-30";

function useList<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  return {
    items,
    add: (item: T) => setItems((prev) => [...prev, item]),
    update: (index: number, patch: Partial<T>) =>
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it))),
    remove: (index: number) => setItems((prev) => prev.filter((_, i) => i !== index)),
    move: (index: number, dir: -1 | 1) =>
      setItems((prev) => {
        const target = index + dir;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      }),
  };
}

function ItemCard({
  index,
  count,
  title,
  onMove,
  onRemove,
  children,
}: {
  index: number;
  count: number;
  title: string;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border border-line bg-bg-raised/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-label text-ink-faint">
          {String(index + 1).padStart(2, "0")} · {title || "Untitled"}
        </span>
        <div className="flex gap-1.5">
          <button type="button" className={iconBtn} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">
            ↑
          </button>
          <button type="button" className={iconBtn} onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down">
            ↓
          </button>
          <button type="button" className={cn(iconBtn, "text-error")} onClick={onRemove} aria-label="Remove">
            ×
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start border border-dashed border-line px-4 py-2.5 text-body-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
    >
      + {children}
    </button>
  );
}

function Mini({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className={small}>{label}</span>
      {children}
    </label>
  );
}

/* ---------------- Packages ---------------- */

export function PackagesEditor({ initial }: { initial: ServicePackage[] }) {
  const list = useList<ServicePackage>(initial);
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="packages" value={JSON.stringify(list.items)} />
      {list.items.length === 0 && (
        <p className="text-body-sm text-ink-faint">
          No packages yet. Add at least one — e.g. Bust / Half body / Full body. Clients pick one when they request.
        </p>
      )}
      {list.items.map((pkg, i) => (
        <ItemCard
          key={pkg.id}
          index={i}
          count={list.items.length}
          title={pkg.name}
          onMove={(d) => list.move(i, d)}
          onRemove={() => list.remove(i)}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Mini label="Name">
              <input className={fieldInputClasses} value={pkg.name} onChange={(e) => list.update(i, { name: e.target.value })} required />
            </Mini>
            <Mini label="Price (USD)">
              <input
                className={fieldInputClasses}
                type="number"
                min={0}
                step="0.01"
                value={pkg.price}
                onChange={(e) => list.update(i, { price: Number(e.target.value) })}
              />
            </Mini>
          </div>
          <Mini label="Short description">
            <input className={fieldInputClasses} value={pkg.description} onChange={(e) => list.update(i, { description: e.target.value })} />
          </Mini>
          <div className="grid gap-3 sm:grid-cols-3">
            <Mini label="Delivery (days)">
              <input
                className={fieldInputClasses}
                type="number"
                min={0}
                value={pkg.delivery_days}
                onChange={(e) => list.update(i, { delivery_days: Number(e.target.value) })}
              />
            </Mini>
            <Mini label="Revisions included">
              <input
                className={fieldInputClasses}
                type="number"
                min={0}
                value={pkg.revisions}
                onChange={(e) => list.update(i, { revisions: Number(e.target.value) })}
              />
            </Mini>
            <Mini label="Max extra characters">
              <input
                className={fieldInputClasses}
                type="number"
                min={0}
                max={MAX_EXTRA_CHARACTERS}
                value={pkg.extra_characters_max}
                onChange={(e) => list.update(i, { extra_characters_max: Number(e.target.value) })}
              />
            </Mini>
          </div>
          <p className="-mt-1 text-[13px] leading-snug text-ink-faint">
            0 = one character only. Above 0, clients get a character counter — each extra character adds this package&apos;s
            price again (+1 = 2×, +2 = 3×). Good for DnD/MTG pieces and custom emotes.
          </p>
          <Mini label="What's included — one per line">
            <textarea
              className={cn(fieldInputClasses, "resize-y")}
              rows={3}
              value={pkg.features.join("\n")}
              onChange={(e) => list.update(i, { features: e.target.value.split("\n") })}
            />
          </Mini>
        </ItemCard>
      ))}
      <AddButton
        onClick={() =>
          list.add({ id: newId(), name: "", description: "", price: 0, delivery_days: 14, revisions: 2, features: [], extra_characters_max: 0 })
        }
      >
        Add package
      </AddButton>
    </div>
  );
}

/* ---------------- Licenses ---------------- */

export function LicensesEditor({ initial }: { initial: ServiceLicense[] }) {
  const [items, setItems] = useState(initial);
  const update = (i: number, patch: Partial<ServiceLicense>) =>
    setItems((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="licenses" value={JSON.stringify(items)} />
      {items.map((lic, i) => {
        const personal = lic.id === "personal";
        return (
          <div key={lic.id} className={cn("flex flex-col gap-3 border border-line p-4", !lic.enabled && "opacity-60")}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-label text-ink-muted">
                {personal ? "Default — always offered" : `Option ${i + 1}`}
              </span>
              {!personal && (
                <label className="flex cursor-pointer items-center gap-2 text-body-sm text-ink">
                  <input
                    type="checkbox"
                    checked={lic.enabled}
                    onChange={(e) => update(i, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  Offer on this service
                </label>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Mini label="Name">
                <input className={fieldInputClasses} value={lic.name} onChange={(e) => update(i, { name: e.target.value })} required />
              </Mini>
              <Mini label="Surcharge (% of total)">
                <input
                  className={fieldInputClasses}
                  type="number"
                  min={0}
                  max={500}
                  step="1"
                  value={lic.percent}
                  onChange={(e) => update(i, { percent: Number(e.target.value) })}
                />
              </Mini>
            </div>
            <Mini label="What it covers">
              <input className={fieldInputClasses} value={lic.description} onChange={(e) => update(i, { description: e.target.value })} />
            </Mini>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Add-ons ---------------- */

/**
 * Add-ons and background options share a shape (name, description, flat
 * price); only the form field and the button label differ.
 */
export function AddonsEditor({
  initial,
  name = "addons",
  addLabel = "Add add-on",
}: {
  initial: ServiceAddon[];
  name?: string;
  addLabel?: string;
}) {
  const list = useList<ServiceAddon>(initial);
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(list.items)} />
      {list.items.map((addon, i) => (
        <ItemCard
          key={addon.id}
          index={i}
          count={list.items.length}
          title={addon.name}
          onMove={(d) => list.move(i, d)}
          onRemove={() => list.remove(i)}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Mini label="Name">
              <input className={fieldInputClasses} value={addon.name} onChange={(e) => list.update(i, { name: e.target.value })} required />
            </Mini>
            <Mini label="Price (USD)">
              <input
                className={fieldInputClasses}
                type="number"
                min={0}
                step="0.01"
                value={addon.price}
                onChange={(e) => list.update(i, { price: Number(e.target.value) })}
              />
            </Mini>
          </div>
          <Mini label="Description">
            <input className={fieldInputClasses} value={addon.description} onChange={(e) => list.update(i, { description: e.target.value })} />
          </Mini>
        </ItemCard>
      ))}
      <AddButton onClick={() => list.add({ id: newId(), name: "", description: "", price: 0 })}>{addLabel}</AddButton>
    </div>
  );
}

/* ---------------- FAQ ---------------- */

export function FaqEditor({ initial }: { initial: ServiceFaq[] }) {
  const list = useList<ServiceFaq & { key: string }>(initial.map((f) => ({ ...f, key: newId() })));
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="faq" value={JSON.stringify(list.items.map(({ q, a }) => ({ q, a })))} />
      {list.items.map((item, i) => (
        <ItemCard
          key={item.key}
          index={i}
          count={list.items.length}
          title={item.q}
          onMove={(d) => list.move(i, d)}
          onRemove={() => list.remove(i)}
        >
          <Mini label="Question">
            <input className={fieldInputClasses} value={item.q} onChange={(e) => list.update(i, { q: e.target.value })} />
          </Mini>
          <Mini label="Answer">
            <textarea
              className={cn(fieldInputClasses, "resize-y")}
              rows={3}
              value={item.a}
              onChange={(e) => list.update(i, { a: e.target.value })}
            />
          </Mini>
        </ItemCard>
      ))}
      <AddButton onClick={() => list.add({ key: newId(), q: "", a: "" })}>Add question</AddButton>
    </div>
  );
}

/* ---------------- Request form questions ---------------- */

const TYPE_LABELS: Record<QuestionType, string> = {
  short: "Short answer",
  long: "Paragraph",
  select: "Dropdown",
  checkbox: "Checkboxes",
  file: "File upload (reference images)",
};

export function QuestionsEditor({ initial }: { initial: ServiceQuestion[] }) {
  const list = useList<ServiceQuestion>(initial);
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="questions" value={JSON.stringify(list.items)} />
      {list.items.length === 0 && (
        <p className="text-body-sm text-ink-faint">
          Clients always give their name, email, and a project brief. Add any extra questions this service needs.
        </p>
      )}
      {list.items.map((q, i) => (
        <ItemCard
          key={q.id}
          index={i}
          count={list.items.length}
          title={q.label}
          onMove={(d) => list.move(i, d)}
          onRemove={() => list.remove(i)}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <Mini label="Question">
              <input className={fieldInputClasses} value={q.label} onChange={(e) => list.update(i, { label: e.target.value })} required />
            </Mini>
            <Mini label="Type">
              <select
                className={fieldInputClasses}
                value={q.type}
                onChange={(e) => list.update(i, { type: e.target.value as QuestionType })}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Mini>
          </div>
          {(q.type === "select" || q.type === "checkbox") && (
            <Mini label="Options — one per line">
              <textarea
                className={cn(fieldInputClasses, "resize-y")}
                rows={3}
                value={q.options.join("\n")}
                onChange={(e) => list.update(i, { options: e.target.value.split("\n") })}
              />
            </Mini>
          )}
          <Mini label="Help text (optional)">
            <input className={fieldInputClasses} value={q.help} onChange={(e) => list.update(i, { help: e.target.value })} />
          </Mini>
          <label className="flex items-center gap-2.5 text-body-sm text-ink">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => list.update(i, { required: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Required
          </label>
        </ItemCard>
      ))}
      <AddButton
        onClick={() => list.add({ id: newId(), label: "", type: "short", options: [], required: false, help: "" })}
      >
        Add question
      </AddButton>
    </div>
  );
}
