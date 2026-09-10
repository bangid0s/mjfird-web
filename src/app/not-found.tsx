import SiteChrome from "@/components/layout/SiteChrome";
import NotFoundContent from "@/components/layout/NotFoundContent";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";

/**
 * The 404 for URLs that match no route at all. Those never enter the site
 * group, so they'd otherwise land on Next's unbranded built-in page — this
 * puts them on the real one, chrome included, so there's a way out.
 */
export default async function RootNotFound() {
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
      <NotFoundContent />
    </SiteChrome>
  );
}
