import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/useTheme";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistMono.variable, "font-sans", sans.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full overflow-hidden">
        <TooltipProvider delay={200}>
          <AuthGateProvider>{children}</AuthGateProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
