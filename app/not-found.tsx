import Link from "next/link";
import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 in the index is worse than no 404 at all.
  robots: { index: false, follow: true },
};

/**
 * Shown for any route that does not exist, and for any `notFound()` call
 * that no nearer not-found file catches.
 *
 * Reuses PageBanner so a mistyped URL still lands somewhere that looks
 * like the product, with the two links that matter. Next's default 404 is
 * unstyled and reads the OS colour scheme rather than our theme, so on a
 * dark-mode phone it arrived as black-on-white system type in the middle
 * of an ivory site.
 */
export default function NotFound() {
  return (
    <main>
      <PageBanner
        compact
        eyebrow="404"
        title="That page isn’t on the map."
        lede="The link may be old, or the place may have moved. The map is still the fastest way back."
      />
      <div className="mx-auto max-w-[1080px] px-5 py-12 sm:py-16">
        <p className="max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
          If you followed a shared cafe link and it brought you here, the pin may have been
          removed. Open the map and search for the place by name.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-6">
          <Link
            href="/map"
            className="painted-link painted-link--primary painted-link--start py-2.5 text-[14px] font-semibold"
          >
            Open the map
            <span aria-hidden="true" className="arrow">
              →
            </span>
            <span aria-hidden="true" className="rule" />
          </Link>
          <Link href="/" className="painted-link py-2.5 text-[13px] font-medium">
            Back to the cover
            <span aria-hidden="true" className="rule" />
          </Link>
        </div>
      </div>
    </main>
  );
}
