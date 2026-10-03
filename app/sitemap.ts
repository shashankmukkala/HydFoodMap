import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * The public surface, and only the public surface.
 *
 * Deliberately hand-listed rather than generated from the cafe table:
 * cafes have no individual routes yet — a place is a `?lat=&lng=` query on
 * `/map`, not a page — so there is nothing per-cafe to submit. The day
 * cafes get their own URLs this should read them from the database and
 * `/map` should stop being the only entry point.
 *
 * `/admin*` is omitted to match robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/map`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/advertise`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/leaderboard`, lastModified, changeFrequency: "daily", priority: 0.5 },
    // Low priority but present on purpose: these have to be crawlable and
    // reachable without signing in, because Google's OAuth review and
    // payment onboarding both go looking for them.
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/refunds`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
