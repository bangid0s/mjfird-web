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
  { name: "Accent soft", varName: "--color-accent-soft" },
  { name: "Accent echo", varName: "--color-accent-echo" },
  { name: "Line", varName: "--color-line" },
  { name: "Line strong", varName: "--color-line-strong" },
];

const typeScale: { label: string; className: string; sample: string }[] = [
  { label: "Display XL", className: "display-xl", sample: "Selected work" },
  { label: "Display LG", className: "display-lg", sample: "Let's build something" },
  { label: "Display MD", className: "display-md", sample: "What I build" },
  { label: "Display SM", className: "display-sm", sample: "Riso battle flyers" },
];

const radii: [string, string][] = [
  ["xs", "var(--radius-xs)"],
  ["sm", "var(--radius-sm)"],
  ["md", "var(--radius-md)"],
  ["lg", "var(--radius-lg)"],
  ["xl", "var(--radius-xl)"],
];

const shadows: [string, string][] = [
  ["xs", "var(--shadow-xs)"],
  ["sm", "var(--shadow-sm)"],
  ["md", "var(--shadow-md)"],
  ["lg", "var(--shadow-lg)"],
];

export default function StyleguidePage() {
  return (
    <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <SectionHeader
        eyebrow="Design System"
        title="Style guide"
        description="The Signal system: a near-neutral canvas, one electric accent, mixed-case grotesk, soft corners and short motion."
      />

      <section className="mb-20">
        <h2 className="eyebrow mb-6">Colour</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colors.map((c) => (
            <div key={c.varName} className="flex flex-col gap-3">
              <div
                className="h-20 w-full rounded-[var(--radius-md)] border border-line"
                style={{ background: `var(${c.varName})` }}
              />
              <div>
                <p className="text-body-sm text-ink">{c.name}</p>
                <p className="mono-meta">{c.varName}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <h2 className="eyebrow mb-6">Type</h2>
        <div className="flex flex-col gap-8">
          {typeScale.map((t) => (
            <div key={t.label} className="border-t border-line pt-5">
              <p className="mono-meta mb-3">{t.label}</p>
              <p className={t.className}>{t.sample}</p>
            </div>
          ))}
          <div className="border-t border-line pt-5">
            <p className="mono-meta mb-3">Body large</p>
            <p className="max-w-2xl text-body-lg text-ink-muted">
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
          <div className="border-t border-line pt-5">
            <p className="mono-meta mb-3">Eyebrow / meta / mono</p>
            <div className="flex flex-col gap-2">
              <p className="eyebrow eyebrow-accent">Selected work</p>
              <p className="meta">A caption, a byline, a count.</p>
              <p className="mono-meta">2025 / 04 / 12:40</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-20">
        <h2 className="eyebrow mb-6">Buttons</h2>
        <div className="flex flex-wrap items-center gap-4">
          <MagneticButton variant="primary" arrow>
            Primary
          </MagneticButton>
          <MagneticButton variant="secondary">Secondary</MagneticButton>
          <MagneticButton variant="ghost">Ghost</MagneticButton>
          <MagneticButton variant="primary" size="lg" arrow>
            Large
          </MagneticButton>
          <span className="pointer-events-none inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-body-sm font-medium text-accent-ink opacity-40">
            Disabled
          </span>
        </div>
      </section>

      <section className="mb-20">
        <h2 className="eyebrow mb-6">Radius &amp; elevation</h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
          {radii.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-2">
              <div
                className="h-20 w-full border border-line bg-bg-raised"
                style={{ borderRadius: value }}
              />
              <p className="mono-meta">radius {label}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {shadows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-2">
              <div
                className="h-20 w-full rounded-[var(--radius-md)] bg-bg-raised"
                style={{ boxShadow: value }}
              />
              <p className="mono-meta">shadow {label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-6">Motion tokens</h2>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["Fast", "160ms"],
            ["Base", "320ms"],
            ["Expressive", "620ms"],
            ["Ease", "settle / respond"],
          ].map(([label, value]) => (
            <div key={label} className="border-t border-line pt-4">
              <dt className="mono-meta">{label}</dt>
              <dd className="mt-1.5 text-body text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
