type Step = { title: string; description: string };
const DASH = " — ";

/** Admin stores "Title|Description"; a line typed without the bar lands whole in the title. */
export function normalizeProcessStep(step: Step): Step {
  if (step.description.trim()) return step;
  const at = step.title.indexOf(DASH);
  if (at <= 0) return step;
  const title = step.title.slice(0, at).trim();
  const description = step.title.slice(at + DASH.length).trim();
  return title && description ? { title, description } : step;
}
