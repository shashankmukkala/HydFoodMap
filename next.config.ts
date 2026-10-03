import type { NextConfig } from "next";

/**
 * Headers applied to every response.
 *
 * No CSP here, deliberately. A real policy for this app has to allow the
 * MapLibre worker (`blob:` workers and `worker-src`), the tile and sprite
 * hosts in lib/mapStyle.ts, Supabase's REST + realtime origins, Google
 * Fonts, the weather/AQI endpoints, and `data:` images for every cafe photo
 * still stored as a data URL. Guessing that list produces a policy that
 * either breaks the map or is permissive enough to be theatre. It should be
 * added once, from the real connect-src list, and verified with
 * `Content-Security-Policy-Report-Only` first — see the deployment notes in
 * README.
 *
 * HSTS is also left out on purpose: Vercel sends it already for custom
 * domains, and setting max-age from here on a domain that is not yet fully
 * HTTPS-only is the one security header that can take a site down and keep
 * it down for the length of the max-age.
 */
const securityHeaders = [
  // This site is never meant to be framed. DENY rather than SAMEORIGIN:
  // nothing here embeds itself, and clickjacking a map that holds a
  // "check in here" button is a real (if small) hazard.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin but not the path to third parties. The map's share
  // links carry ?lat=&lng= — the coordinates of a place someone is
  // standing at — and those should not ride along in a Referer header to
  // a tile host or an advertiser's destination URL.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation is the one powerful feature this app uses, and it needs it
  // first-party for the check-in flow. Everything else is denied so an
  // embedded advertiser creative cannot ask for a camera or a microphone.
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Keeps a cross-origin window from holding a handle on ours.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The admin console must never be cached by a shared proxy or shown
      // from the back/forward cache after an operator signs out.
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      // API responses are per-caller (several read the bearer token) and
      // must not be held by an intermediary.
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
