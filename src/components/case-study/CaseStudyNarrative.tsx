import type { Project } from "@/lib/placeholder-data";

// The narrative keys stay the same in the database; only the public labels are
// project-oriented now: brief → idea → execution → result.
export const NARRATIVE_SECTIONS: {
  key: keyof Project["narrative"];
  label: string;
}[] = [
  { key: "context", label: "The brief" },
  { key: "move", label: "The idea" },
  { key: "build", label: "The execution" },
  { key: "result", label: "The result" },
];

export default function CaseStudyNarrative({
  narrative,
  className,
}: {
  narrative: Project["narrative"];
  className?: string;
}) {
  const sections = NARRATIVE_SECTIONS.filter(({ key }) => narrative[key]?.trim());
  if (sections.length === 0) return null;

  return (
    <div className={className ?? "flex flex-col gap-12"}>
      {sections.map(({ key, label }) => (
        <section key={key} className="flex flex-col gap-3">
          <p className="font-mono text-label uppercase tracking-[0.2em] text-accent">{label}</p>
          <p className="max-w-2xl font-body text-body-lg leading-relaxed text-ink">
            {narrative[key]}
          </p>
        </section>
      ))}
    </div>
  );
}
