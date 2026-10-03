import Image from "next/image";
import Link from "next/link";

/**
 * The cover. One screen, no scroll: the painting and the ways in.
 *
 * Every other surface in this product is a tool and is built like one —
 * ivory, hairlines, tight corners. This page is not a tool. Its job is to
 * say what this is and send you to the map, and a page with one job can be
 * a picture with words placed on it.
 *
 * WHERE THE WORDS GO. The painting has painted words of its own: the
 * Telugu on the wall, and a chalkboard reading FILTER COFFEE GOOD PEOPLE
 * in cream capitals, bottom right. Real links set in cream capitals beside
 * that board would invite a reader to tap all of it. So the navigation
 * sits top right, over open sky with nothing painted in it, and the
 * headline sits bottom left over the pavement, as far from the board as
 * the frame allows.
 *
 * SCRIMS, NOT PANELS. Type over illustration needs a floor, but a card
 * would put a rectangle in the middle of a painting. Soft gradients darken
 * exactly where the words go and nowhere else.
 *
 * GRAIN OVER EVERYTHING. The art is upscaled (scripts/build-home-art), and
 * an SVG turbulence filter is resolution-independent, so the surface
 * texture stays crisp at any density even where the picture is not.
 */

const SECONDARY = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/advertise", label: "Advertise" },
] as const;

export default function HomeCover({
  total,
}: {
  /** null when the live count couldn't be read — the eyebrow then just
      says "Hyderabad" rather than printing a number from a stale seed. */
  total: number | null;
}) {
  return (
    <section className="cover-screen relative isolate h-[100svh] overflow-hidden bg-[#1a1411] text-[#f6ece0]">
      {/* A <picture>, not next/image: the two files are different crops of
          the painting (art direction), not two sizes of one image, and
          next/image would preload both to show one. They are pre-encoded
          WebP at the sizes they are used. */}
      <picture>
        <source media="(min-width: 640px)" srcSet="/home-wide.webp" />
        <img
          src="/home-tall.webp"
          alt="A red-walled Hyderabad cafe under a green awning in late sun — people at outdoor tables, a barista at the counter, and the Charminar behind."
          fetchPriority="high"
          decoding="async"
          className="cover-art absolute inset-0 -z-20 h-full w-full object-cover object-[38%_50%] sm:object-center"
        />
      </picture>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            // top, for the mark and the links; bottom, for the headline;
            // left, so the headline's first words have a floor on a wide
            // screen where the bottom band alone is thin.
            "linear-gradient(to bottom, rgba(26,20,17,0.72) 0%, rgba(26,20,17,0.28) 16%, transparent 30%)," +
            "linear-gradient(to top, rgba(26,20,17,0.9) 0%, rgba(26,20,17,0.55) 24%, transparent 50%)," +
            "linear-gradient(to right, rgba(26,20,17,0.5) 0%, rgba(26,20,17,0.2) 30%, transparent 55%)",
        }}
      />

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 h-full w-full opacity-[0.14] mix-blend-overlay"
      >
        <filter id="cover-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cover-grain)" />
      </svg>

      <div className="relative z-30 flex h-full flex-col px-5 py-5 sm:px-10 sm:py-8">
        <header className="cover-rise flex items-center justify-between gap-4">
          <Link href="/" className="-m-2 flex shrink-0 items-center gap-2.5 p-2">
            <Image src="/logo-mark-light.png" alt="" width={256} height={256} className="h-9 w-9" priority />
            {/* Dropped on a phone: mark, wordmark and two links measured
                wider than the row. The mark alone still says where home is. */}
            <span className="hidden text-[12px] font-semibold tracking-[0.18em] uppercase text-[#f6ece0e6] sm:inline">
              HydCafeMap
            </span>
          </Link>

          {/* Padding rather than gap between links, so each is a 44px-plus
              target with no dead strip — at 11px letterspaced caps the
              words themselves are only ~16px tall. */}
          <nav className="flex items-center gap-3 sm:gap-6">
            {SECONDARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="painted-link px-1 py-3 text-[11px] font-medium sm:text-[12px]"
              >
                {item.label}
                <span aria-hidden="true" className="rule" />
              </Link>
            ))}
          </nav>
        </header>

        <div className="flex-1" />

        {/* One line for the headline on a wide screen keeps the block low,
            under the painted "Same City Different Brews" on the wall —
            painted words showing through real ones read as a misprint. */}
        <footer className="cover-rise cover-rise-late max-w-[36rem] sm:max-w-[52rem]">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--lamp)] sm:text-[12px]">
            {/* The count is read live — "86 cafes" in a string is wrong the
                moment an eighty-seventh is pinned. */}
            {total && total > 0 ? `${total} cafes · ` : ""}Hyderabad
          </p>
          <h1 className="mt-3 text-[2.4rem] leading-[1.02] sm:text-[4rem]">
            Same city. <br className="sm:hidden" />
            Different brews.
          </h1>
          <p className="mt-3 max-w-[26rem] text-[15px] leading-relaxed text-[#f6ece0c7] sm:text-[16px]">
            Every cafe worth the trip, on one map — rated only by people whose phone says they were there.
          </p>

          <Link
            href="/map"
            className="painted-link painted-link--primary painted-link--start mt-6 py-2.5 text-[14px] font-semibold sm:mt-8 sm:text-[15px]"
          >
            Open the map
            <span aria-hidden="true" className="arrow">
              →
            </span>
            <span aria-hidden="true" className="rule" />
          </Link>
        </footer>
      </div>
    </section>
  );
}
