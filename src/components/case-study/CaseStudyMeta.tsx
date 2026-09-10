import type { Project } from "@/lib/placeholder-data";

export default function CaseStudyMeta({ project }: { project: Project }) {
  const rows: [string, string][] = [
    ["Client", project.client],
    ["Year", project.year],
    ["Role", project.role],
    ["Category", project.category],
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-7 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1.5">
          <dt className="eyebrow">{label}</dt>
          <dd className="text-body text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
