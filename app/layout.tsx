import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGateProvider } from "@/lib/AuthGate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/siteUrl";

// Switzer runs the interface and Boska the headlines — the pair the night
// theme this follows uses. Both come from Fontshare rather than next/font,
// which carries no Fontshare provider, so the stacks are declared in
// globals.css's @theme and the faces are fetched by the <link> below.
//
// The trade is real and accepted: next/font self-hosts and injects fallback
// metrics to stop layout shift, and a CDN stylesheet does neither. Both
// stacks name concrete local fallbacks so a blocked or slow Fontshare
// degrades to a similar face rather than to Times.
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
  // Their --bg, matching --paper, so the mobile address bar continues the
  // page instead of capping it with a pale strip.
  themeColor: "#0e1116",
};

// Dark is the only theme. `dark` is back on <html> because that is what
// switches on the `dark:` variants, which only components/ui/badge.tsx and
// button.tsx still use — everything else reads the palette through the
// tokens in globals.css, which is where the night values live. The `.dark`
// block in that file sets only shadcn primitives and is overridden by the
// night block below it, so the class costs nothing beyond those variants.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("dark antialiased", geistMono.variable, "font-sans")}>
      <head>
        {/* Opening the connection early matters more than usual here: this
            is a render-blocking stylesheet on a third-party origin. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=boska@400,500,700&f[]=switzer@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
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
