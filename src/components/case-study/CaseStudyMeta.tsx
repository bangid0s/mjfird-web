import type { Project } from "@/lib/placeholder-data";

export default function CaseStudyMeta({ project }: { project: Project }) {
  const rows: [string, string][] = [
    ["Client", project.client],
    ["Year", project.year],
    ["Role", project.role],
    ["Category", project.category],
  ];

  return (
    <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-mono text-label uppercase tracking-[0.15em] text-ink-faint">{label}</dt>
          <dd className="mt-1 font-body text-body-sm text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
