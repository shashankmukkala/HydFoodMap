import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGateProvider } from "@/lib/AuthGate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/siteUrl";

// Two faces doing two jobs. Inter runs the interface, where a serif would
// cost legibility at 13px for nothing. Instrument Serif runs the headlines,
// where one well-set serif is the cheapest premium signal there is. It
// ships one weight on purpose: size and tracking do the work, not boldness.
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "HydCafeMap";
const DESCRIPTION = "Every cafe worth the trip in Hyderabad, on one map.";

// metadataBase is what every relative URL below resolves against, and Next
// errors the build if a relative metadata URL is used without one. It comes
// from lib/siteUrl so robots.ts and sitemap.ts agree with the tags here
// rather than each hardcoding an origin.
//
// openGraph/twitter are not decoration: without them every share of this
// site — WhatsApp, Instagram DMs, X, Slack — renders as a bare grey link,
// which for a product discovered by sharing a place is the whole first
// impression. The image is the home cover art that already ships for the
// landing page, so there is nothing extra to generate or keep in sync.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · HydCafeMap" },
  description: DESCRIPTION,
  applicationName: TITLE,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_IN",
    images: [{ url: "/home-wide.webp", width: 1663, height: 945, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/home-wide.webp"],
  },
  // Cafe cards carry phone numbers; iOS otherwise rewrites anything that
  // looks like one into its own blue link, inside our own styled rows.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The map shell is h-dvh with its own overflow handling and the bottom
  // sheets already use safe-area insets, so the layout wants the full
  // notch region rather than the inset-safe box Safari hands it by default.
  viewportFit: "cover",
  themeColor: "#f7f4ed",
};

// Light is the only theme. The `dark` class that used to sit here is what
// switched on every `dark:` variant in the tree; with it gone the whole
// component library takes its light branch. The palette itself lives in
// globals.css under IVORY.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("antialiased", geistMono.variable, "font-sans", sans.variable, display.variable)}>
      {/* No h-full on either element. `height: 100%` pins the document to
          the viewport, so a page taller than one screen renders its
          overflow with nothing to scroll. The map does not need it —
          map-experience-shell carries its own h-dvh and overflow-hidden. */}
      <body>
        <TooltipProvider delay={200}>
          <AuthGateProvider>{children}</AuthGateProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
