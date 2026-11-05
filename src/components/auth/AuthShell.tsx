import Reveal from "@/components/motion/Reveal";

export default function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-page grid gap-12 pb-[var(--space-section)] pt-14 sm:pt-20 lg:grid-cols-[1fr_28rem] lg:gap-20">
      <Reveal className="flex flex-col gap-6">
        <p className="eyebrow eyebrow-accent">{eyebrow}</p>
        <h1 className="display-lg text-balance">{title}</h1>
        {intro && <p className="max-w-md text-body-lg text-pretty text-ink-muted">{intro}</p>}
      </Reveal>
      <Reveal delay={80} className="flex flex-col gap-6">
        {children}
        {footer && <div className="border-t border-line pt-5 text-body-sm text-ink-muted">{footer}</div>}
      </Reveal>
    </div>
  );
}
