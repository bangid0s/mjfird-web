import Reveal from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";
import { normalizeProcessStep } from "@/lib/process-steps";

/** Numbered steps. A sentence typed whole into the title field is split back into title and description. */
export default function ProcessSteps({
  steps,
  dense = false,
}: {
  steps: { title: string; description: string }[];
  /** Two across on a phone too, where the steps are one section among many. */
  dense?: boolean;
}) {
  return (
    <ol className={cn("grid sm:grid-cols-2 lg:grid-cols-4", dense ? "grid-cols-2 gap-x-5 gap-y-8 sm:gap-8" : "gap-8")}>
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
