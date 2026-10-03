/**
 * The canonical origin for this deployment.
 *
 * Everything that has to emit an absolute URL reads it from here —
 * `metadataBase` in the root layout, `robots.ts`, `sitemap.ts` — so there
 * is one value to set per environment instead of three places to forget.
 *
 * Next resolves relative metadata URLs against `metadataBase` and *errors
 * the build* if a relative URL is used without one, so this must always
 * return something parseable. The localhost fallback keeps `next build`
 * working on a machine with no env file; it is wrong in production, which
 * is why `NEXT_PUBLIC_SITE_URL` is documented as required there.
 *
 * VERCEL_PROJECT_PRODUCTION_URL is the host of the production deployment
 * (no scheme), set by Vercel itself. Preferring it over VERCEL_URL is
 * deliberate: VERCEL_URL is the *current* deployment's unique hostname, so
 * canonical tags and sitemaps built from it would point at a throwaway
 * preview URL that search engines might then index.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/** True once a real origin is configured — i.e. not the dev fallback. */
export const IS_SITE_URL_CONFIGURED = SITE_URL !== "http://localhost:3000";
