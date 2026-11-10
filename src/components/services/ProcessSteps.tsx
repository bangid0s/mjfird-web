import Reveal from "@/components/motion/Reveal";
import { normalizeProcessStep } from "@/lib/process-steps";

/** Numbered steps. A sentence typed whole into the title field is split back into title and description. */
export default function ProcessSteps({ steps }: { steps: { title: string; description: string }[] }) {
  return (
    <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(normalizeProcessStep).map((step, i) => (
        <Reveal as="li" key={i} delay={i * 70} className="flex flex-col gap-3">
          <span className="grid h-9 w-9 place-items-center bg-accent text-body-sm font-medium text-accent-ink">
            {i + 1}
          </span>
          <h3 className="display-sm mt-1">{step.title}</h3>
          {step.description && <p className="text-body-sm text-pretty text-ink-muted">{step.description}</p>}
        </Reveal>
      ))}
    </ol>
  );
}
