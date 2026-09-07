import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGateProvider } from "@/lib/AuthGate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Plus Jakarta Sans reads more distinctive/premium than a system-ish
// default at UI sizes (rounded terminals, tighter numerals) — used for
// every weight in the app now, not just headings.
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HydCafemap",
  description: "An interactive 3D map of Hyderabad — cafes and billboards.",
};

// Dark is the only theme now — no toggle, no stored preference, no
// light-mode CSS to keep in sync. Applied here directly (not via a
// client-side hook adding a class after hydration) so there's no
// flash-of-light-theme on first paint.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "dark", geistMono.variable, "font-sans", sans.variable)}
    >
      {/* Not overflow-hidden here — that would block normal page scroll
          on every non-map route (e.g. /admin/users, /profile). The map
          experience already contains its own scroll via
          map-experience-shell's own h-dvh + overflow-hidden, so it
          doesn't need the body to also clip. */}
      <body className="h-full">
        <TooltipProvider delay={200}>
          <AuthGateProvider>{children}</AuthGateProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
