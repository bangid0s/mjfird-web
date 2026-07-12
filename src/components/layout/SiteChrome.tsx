"use client";

import SmoothScroll from "@/components/motion/SmoothScroll";
import CustomCursor from "@/components/motion/CustomCursor";
import Preloader from "@/components/motion/Preloader";
import PageTransition from "@/components/motion/PageTransition";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { SoundProvider } from "@/lib/sound";

export default function SiteChrome({
  children,
  availabilityStatus,
  socials,
  footerHeading,
  footerSubtext,
  contactEmail,
  logoUrl,
  logoUrlLight,
  logoType,
  logoText,
  navLinks,
}: {
  children: React.ReactNode;
  availabilityStatus?: string;
  socials: { label: string; url: string }[];
  footerHeading: string;
  footerSubtext: string;
  contactEmail: string;
  logoUrl?: string | null;
  logoUrlLight?: string | null;
  logoType?: "text" | "image";
  logoText?: string;
  navLinks: { label: string; href: string }[];
}) {
  return (
    <SoundProvider>
      <SmoothScroll>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[var(--z-modal)] -translate-y-24 bg-accent px-4 py-2 font-mono text-label uppercase tracking-[0.1em] text-accent-ink transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Preloader />
        <CustomCursor />
        <Nav
          availabilityStatus={availabilityStatus}
          logoUrl={logoUrl}
          logoUrlLight={logoUrlLight}
          logoType={logoType}
          logoText={logoText}
          links={navLinks}
        />
        <main id="main-content" className="flex-1 pt-20">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer
          socials={socials}
          heading={footerHeading}
          subtext={footerSubtext}
          contactEmail={contactEmail}
          links={navLinks}
        />
      </SmoothScroll>
    </SoundProvider>
  );
}
