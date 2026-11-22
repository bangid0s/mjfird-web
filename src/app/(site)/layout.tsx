import SiteChrome from "@/components/layout/SiteChrome";
import Analytics from "@/components/analytics/Analytics";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getSlotState } from "@/lib/data/slots";
import ClickTracker from "@/components/analytics/ClickTracker";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, settings, slots] = await Promise.all([getProfile(), getSiteSettings(), getSlotState()]);

  return (
    <>
      <SiteChrome
        socials={profile.socials}
        footerHeading={settings.footerHeading}
        footerSubtext={settings.footerSubtext}
        logoUrl={settings.logoUrl}
        logoUrlLight={settings.logoUrlLight}
        logoType={settings.logoType}
        logoText={settings.logoText}
        navLinks={settings.navLinks}
        slots={slots}
      >
        {children}
      </SiteChrome>
      <Analytics measurementId={settings.gaMeasurementId} />
      <ClickTracker />
    </>
  );
}
