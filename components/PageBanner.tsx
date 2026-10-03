import Image from "next/image";
import Link from "next/link";

/**
 * The painted band across the top of every page that is not the map or
 * the cover.
 *
 * The cover is a painting with words on it. These pages are forms and
 * lists, and a form has to stay a form — cream type over an illustrated
 * street is unreadable at 13px. So the painting takes the top of the page
 * and stops: header, title, one line of lede, then a hard edge into ivory
 * and the work begins. A hard edge rather than a fade, because a gradient
 * dissolving a picture into a form reads as indecision; a clean line says
 * the picture was placed there on purpose.
 *
 * It also carries the site navigation, which on a phone has to answer
 * "which two places can you go from here" — three links do not fit
 * across 390px, and the one to the page you are on is the one to drop.
 */

const DESTINATIONS = {
  map: { href: "/map", label: "Open map" },
  leaderboard: { href: "/leaderboard", label: "Leaderboard" },
  advertise: { href: "/advertise", label: "Advertise" },
} as const;

type Destination = keyof typeof DESTINATIONS;

export default function PageBanner({
  active,
  eyebrow,
  title,
  lede,
  compact = false,
}: {
  /** The page being shown, whose own link is left out. */
  active?: Destination;
  eyebrow: string;
  title: string;
  lede?: string;
  /** A shallower band, for pages whose content should start high (profile). */
  compact?: boolean;
}) {
  const going = (Object.keys(DESTINATIONS) as Destination[]).filter((k) => k !== active).slice(0, 2);

  return (
    <section className="cover-screen relative isolate overflow-hidden bg-[#1a1411] text-[#f6ece0]">
      {/* The upper part of the painting — wall, awning and sky — which is
          quieter than the storefront, and a shallow band needs quiet behind
          type. Same file as the cover, so anyone arriving from there has it
          cached already. */}
      <Image
        src="/home-wide.webp"
        alt=""
        width={2400}
        height={1364}
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_42%]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(26,20,17,0.72) 0%, rgba(26,20,17,0.55) 45%, rgba(26,20,17,0.82) 100%)," +
            "linear-gradient(to right, rgba(26,20,17,0.55) 0%, rgba(26,20,17,0.2) 45%, transparent 75%)",
        }}
      />

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 h-full w-full opacity-[0.14] mix-blend-overlay"
      >
        <filter id="banner-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#banner-grain)" />
      </svg>

      <div
        className={`relative z-30 mx-auto max-w-[1080px] px-5 pt-5 sm:pt-6 ${compact ? "pb-8 sm:pb-10" : "pb-10 sm:pb-14"}`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Plain utilities, NOT .painted-link: that class is unlayered and
              would beat the utility layer, turning the logo row into
              letterspaced inline capitals. */}
          <Link
            href="/"
            className="-m-2 flex shrink-0 items-center gap-2.5 p-2 opacity-90 transition-opacity hover:opacity-100"
          >
            <Image src="/logo-mark-light.png" alt="" width={256} height={256} className="h-8 w-8" />
            <span className="hidden text-[12px] font-semibold tracking-[0.18em] uppercase sm:inline">HydCafeMap</span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-7">
            {going.map((key) => (
              <Link
                key={key}
                href={DESTINATIONS[key].href}
                className={`painted-link px-1 py-3 text-[11px] font-medium whitespace-nowrap sm:text-[12px] ${key === "map" ? "painted-link--primary" : ""}`}
              >
                {DESTINATIONS[key].label}
                <span aria-hidden="true" className="rule" />
              </Link>
            ))}
          </nav>
        </div>

        <div className={compact ? "pt-8 sm:pt-10" : "pt-10 sm:pt-14"}>
          <span className="text-[11px] font-semibold tracking-[0.2em] text-[var(--lamp)] uppercase sm:text-[12px]">
            {eyebrow}
          </span>
          <h1 className="mt-3 max-w-3xl text-[2.1rem] leading-[1.06] sm:text-[3rem]">{title}</h1>
          {lede && <p className="mt-3 max-w-xl text-[15px] text-[#f6ece0c7] sm:text-[16px]">{lede}</p>}
        </div>
      </div>
    </section>
  );
}
