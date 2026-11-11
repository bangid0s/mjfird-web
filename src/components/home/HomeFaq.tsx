import Link from "next/link";
import SectionBand from "@/components/layout/SectionBand";
import Reveal from "@/components/motion/Reveal";
import ServicesFaq from "@/components/services/ServicesFaq";

/*
  The questions that stop an order. The heading holds its place beside the
  list on wide screens, so the section reads as a pair rather than as another
  full-width header over another full-width block.
*/
export default function HomeFaq({ index, items }: { index: number; items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <SectionBand id="faq">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="flex flex-col items-start gap-6 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:col-span-4 lg:self-start">
          <div className="flex w-full items-center gap-4 border-t border-line pt-4">
            <span className="mono-meta text-ink">{String(index).padStart(2, "0")}</span>
            <span className="eyebrow">FAQ</span>
          </div>
          <h2 className="display-md">Before you order</h2>
          <p className="text-body text-pretty text-ink-muted">
            Something else on your mind?{" "}
            <Link
              href="/contact"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-accent"
            >
              Ask me directly
            </Link>
            .
          </p>
        </Reveal>
        <div className="lg:col-span-8">
          <ServicesFaq items={items} />
        </div>
      </div>
    </SectionBand>
  );
}
