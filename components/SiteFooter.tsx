import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/**
 * The site's only footer, carrying the links that have to be reachable
 * from inside the product rather than by typing a URL.
 *
 * It exists mostly for two external reviewers: Google's OAuth consent
 * screen check wants a privacy policy linked from the app, and payment
 * onboarding wants the refund policy linked from wherever money is asked
 * for — which is why /advertise gets this footer specifically.
 *
 * Not on the cover or the map. The cover is one screen with no scroll by
 * design, and the map is a full-viewport shell with its own overflow
 * handling; a footer in either would be a layout fight for no gain, since
 * both link onward to pages that do carry it.
 */

const LINKS = [
  { href: "/map", label: "Map" },
  { href: "/advertise", label: "Advertise" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-deep">
      <div className="mx-auto max-w-[1080px] px-5 py-10">
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-1 text-[13px] text-ink-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-ink hover:decoration-current"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-[12px] leading-relaxed text-[var(--ink-soft)]">
          © {new Date().getFullYear()} {LEGAL.entityName}. HydCafeMap is an independent guide to
          Hyderabad — listings are editorial and are not paid placements. Sponsored formats are
          always labelled as such.
        </p>
      </div>
    </footer>
  );
}
