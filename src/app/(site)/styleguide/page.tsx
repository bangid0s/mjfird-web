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
  { name: "Accent strong (text)", varName: "--color-accent-strong" },
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

export default function StyleguidePage() {
  return (
    <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <SectionHeader
        index={1}
        eyebrow="Design System"
        title="Style guide"
        description="The Studio Spec system: one cool grey sheet, one hot accent used for marks and fills rather than text, hard edges with no elevation, and letterspaced mono labels rationed against open ground."
      />

      <section className="mb-20">
        <h2 className="eyebrow mb-6">Colour</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colors.map((c) => (
            <div key={c.varName} className="flex flex-col gap-3">
              <div
                className="h-20 w-full border border-line"
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
          <span className="pointer-events-none inline-flex items-center justify-center bg-accent px-5 py-2.5 text-body-sm font-medium text-accent-ink opacity-40">
            Disabled
          </span>
        </div>
      </section>

      <section className="mb-20">
        <h2 className="eyebrow mb-6">Using the accent</h2>
        <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
          <div className="flex flex-col gap-3 bg-bg p-6">
            <span className="grid h-16 w-full place-items-center bg-accent text-accent-ink">
              <span className="spec">On a fill</span>
            </span>
            <p className="text-body-sm text-ink-muted">
              --color-accent behind --color-accent-ink. The ink is derived from the
              accent&apos;s luminance, so a custom brand colour stays readable.
            </p>
          </div>
          <div className="flex flex-col gap-3 bg-bg p-6">
            <span className="grid h-16 w-full place-items-center border border-line">
              <span className="eyebrow eyebrow-accent">Accent as text</span>
            </span>
            <p className="text-body-sm text-ink-muted">
              --color-accent-strong, darkened to clear AA. The raw accent is only
              3:1 on this ground and is not a text colour.
            </p>
          </div>
          <div className="flex flex-col gap-3 bg-bg p-6">
            <span className="grid h-16 w-full place-items-center border border-line">
              <span className="h-3 w-10 bg-accent" />
            </span>
            <p className="text-body-sm text-ink-muted">
              Marks, rules and indicators. This is where the accent does most of
              its work — sparingly, against empty ground.
            </p>
          </div>
        </div>
        <p className="mono-meta mt-6">
          Radius 0 across the scale / elevation flat except --shadow-lg for true overlays
        </p>
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
