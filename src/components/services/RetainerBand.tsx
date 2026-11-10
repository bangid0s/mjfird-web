import MagneticButton from "@/components/ui/MagneticButton";
import SectionBand from "@/components/layout/SectionBand";
import Reveal from "@/components/motion/Reveal";
import type { SiteSettings } from "@/lib/data/site-settings";

type Props = {
  settings: Pick<
    SiteSettings,
    | "retainerEnabled" | "retainerEyebrow" | "retainerTitle" | "retainerIntro"
    | "retainerPoints" | "retainerPriceLabel" | "retainerCtaLabel"
  >;
};

/**
 * The one accent band on the page: ongoing monthly work, for clients who want
 * more than one piece. Copy is set in full ink: the muted ink is a 76% mix that
 * drops below AA for body text on some accent colours.
 */
export default function RetainerBand({ settings }: Props) {
  if (!settings.retainerEnabled) return null;
  return (
    <SectionBand tone="accent" id="retainer">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Reveal className="flex flex-col items-start gap-6">
          <p className="eyebrow text-ink">{settings.retainerEyebrow}</p>
          <h2 className="display-lg">{settings.retainerTitle}</h2>
          <p className="max-w-lg text-body-lg text-pretty text-ink">{settings.retainerIntro}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
            <MagneticButton href="/contact?type=retainer" size="lg" variant="secondary" arrow>
              {settings.retainerCtaLabel}
            </MagneticButton>
            <span className="text-body text-ink">{settings.retainerPriceLabel}</span>
          </div>
        </Reveal>
        {settings.retainerPoints.length > 0 && (
          <Reveal delay={80}>
            <ul className="flex flex-col border-t border-line">
              {settings.retainerPoints.map((point) => (
                <li key={point} className="flex items-baseline gap-4 border-b border-line py-4 text-body-lg text-ink">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 -translate-y-[0.2em] bg-current" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </SectionBand>
  );
}
