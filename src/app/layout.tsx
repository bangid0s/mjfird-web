import type { Metadata } from "next";
import { Instrument_Sans, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/data/site-settings";
import { shareMetadata } from "@/lib/social-share";
import { SITE_URL } from "@/lib/site-url";
import { readableInk } from "@/lib/color";
import { THEME_STORAGE_KEY } from "@/lib/theme";

// ISR window for public pages: admin saves revalidate instantly via
// revalidatePath, this catches edits made directly in the Supabase dashboard.
export const revalidate = 60;

// Display: a tight mixed-case grotesk with a little more character than a
// neutral UI face, used for every heading.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

// Body/UI: neutral, highly legible, wide weight range.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Mono is deliberately rationed now — years, indices, clocks, code.
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: settings.siteTitle,
      template: "%s — MJFIRD",
    },
    description: settings.siteDescription,
    ...(settings.faviconUrl && {
      icons: {
        icon: settings.faviconUrl,
        shortcut: settings.faviconUrl,
        apple: settings.faviconUrl,
      },
    }),
    ...shareMetadata(settings),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${geist.variable} ${jetBrainsMono.variable} h-full`}
      style={
        {
          // Everything accent-coloured derives from these two: the raw brand
          // hex, and the text colour that stays readable on top of it.
          "--color-accent-base": settings.accentColor,
          "--color-accent-ink-light": readableInk(settings.accentColor),
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {/*
          Theme, resolved before first paint. No stored choice means "follow the
          OS", which the stylesheet handles on its own — so this only stamps the
          attribute when the visitor has explicitly picked a side.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem(${JSON.stringify(
              THEME_STORAGE_KEY,
            )});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
