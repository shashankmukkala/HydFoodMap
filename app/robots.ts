import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Crawl the public product; keep everything else out of the index.
 *
 * `/admin` and `/api` are disallowed because neither belongs in search
 * results — the admin console is a sign-in wall and the API returns JSON
 * that would compete with the real pages for the same queries. This is a
 * crawler hint, not access control: the actual protection is `is_admin()`
 * in Postgres and `requireAdmin` on the routes (lib/adminAuth.ts).
 *
 * `/users` is a bare redirect into `/admin/users`, so it is noise too.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/users"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
