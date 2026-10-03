import type { ReactNode } from "react";
import PageBanner from "@/components/PageBanner";
import SiteFooter from "@/components/SiteFooter";
import { LEGAL } from "@/lib/legal";

/**
 * The shared shell for /privacy, /terms and /refunds.
 *
 * One component so the three pages cannot drift into three different
 * layouts, and so the "last updated" line is rendered the same way in all
 * of them — a policy page where that date is formatted differently on each
 * tab looks assembled from borrowed parts, which is exactly the impression
 * a legal page cannot afford.
 *
 * `.legal-prose` in globals.css carries the typography: these pages are
 * long-form reading, not interface, so they get a measure and a rhythm
 * rather than the tight interface spacing used everywhere else.
 */
export default function LegalPage({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const updated = new Date(LEGAL.lastUpdated).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main>
      <PageBanner compact eyebrow={eyebrow} title={title} lede={lede} />
      <div className="mx-auto max-w-[46rem] px-5 py-12 sm:py-16">
        <p className="text-[12px] tracking-[0.08em] text-[var(--ink-soft)] uppercase">
          Last updated {updated}
        </p>
        <div className="legal-prose mt-9">{children}</div>
      </div>
      <SiteFooter />
    </main>
  );
}
