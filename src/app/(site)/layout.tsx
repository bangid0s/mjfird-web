import SiteChrome from "@/components/layout/SiteChrome";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, settings] = await Promise.all([getProfile(), getSiteSettings()]);

  return (
    <SiteChrome
      availabilityStatus={profile.availabilityStatus}
      socials={profile.socials}
      footerHeading={settings.footerHeading}
      footerSubtext={settings.footerSubtext}
      contactEmail={settings.contactEmail}
      logoUrl={settings.logoUrl}
      logoUrlLight={settings.logoUrlLight}
      logoType={settings.logoType}
      logoText={settings.logoText}
      navLinks={settings.navLinks}
    >
      {children}
    </SiteChrome>
  );
}
