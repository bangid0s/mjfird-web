import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";

export const metadata: Metadata = {
  title: "Style Guide",
  description: "MJFIRD design system reference.",
  robots: { index: false },
};

const colors: { name: string; varName: string }[] = [
  { name: "Background", varName: "--color-bg" },
  { name: "Surface", varName: "--color-bg-raised" },
  { name: "Surface 2", varName: "--color-bg-raised-2" },
  { name: "Ink", varName: "--color-ink" },
  { name: "Ink muted", varName: "--color-ink-muted" },
  { name: "Ink faint", varName: "--color-ink-faint" },
  { name: "Accent", varName: "--color-accent" },
  { name: "Accent echo", varName: "--color-accent-echo" },
  { name: "Line", varName: "--color-line" },
];

const typeScale: { label: string; className: string }[] = [
  { label: "Display XL", className: "text-display-xl" },
  { label: "Display LG", className: "text-display-lg" },
  { label: "Display MD", className: "text-display-md" },
  { label: "Display SM", className: "text-display-sm" },
];

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
      <SectionHeader eyebrow="Design System" title="Style guide" />

      <section className="mb-20">
        <h2 className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Color</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {colors.map((c) => (
            <div key={c.varName} className="flex flex-col gap-3">
              <div
                className="h-20 w-full border border-line"
                style={{ background: `var(${c.varName})` }}
              />
              <div>
                <p className="font-body text-body-sm text-ink">{c.name}</p>
                <p className="font-mono text-label text-ink-faint">{c.varName}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <h2 className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Type</h2>
        <div className="flex flex-col gap-6">
          {typeScale.map((t) => (
            <div key={t.label} className="border-t border-line pt-4">
              <p className="mb-2 font-mono text-label text-ink-faint">{t.label}</p>
              <p className={`font-display uppercase leading-[0.9] text-ink ${t.className}`}>
                MJFIRD
              </p>
            </div>
          ))}
          <div className="border-t border-line pt-4">
            <p className="mb-2 font-mono text-label text-ink-faint">Body large</p>
            <p className="font-body text-body-lg text-ink">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-2 font-mono text-label text-ink-faint">Mono / label</p>
            <p className="font-mono text-label uppercase tracking-[0.15em] text-ink">
              Eyebrow — meta — tag
            </p>
          </div>
        </div>
      </section>

      <section className="mb-20">
        <h2 className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <MagneticButton variant="primary">Primary</MagneticButton>
          <MagneticButton variant="secondary">Secondary</MagneticButton>
          <MagneticButton variant="ghost">Ghost</MagneticButton>
          <span className="pointer-events-none inline-flex items-center justify-center gap-2 bg-accent px-6 py-3 font-mono text-label uppercase tracking-[0.15em] text-accent-ink opacity-40">
            Disabled
          </span>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Motion tokens</h2>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["Fast", "180ms"],
            ["Base", "380ms"],
            ["Expressive", "680ms"],
            ["Ease", "freeze / swing"],
          ].map(([label, value]) => (
            <div key={label} className="border-t border-line pt-4">
              <dt className="font-mono text-label text-ink-faint">{label}</dt>
              <dd className="mt-1 font-body text-body text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
