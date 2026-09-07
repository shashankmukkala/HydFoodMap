import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";
import { CATEGORY_OPTIONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";

export type AdminAnalytics = {
  totals: {
    cafes: number;
    reviews: number;
    avgRating: number | null;
    visits: number;
    bookmarks: number;
    users: number;
    searches: number;
    zeroResultSearches: number;
  };
  topVisited: { cafeId: string; name: string; count: number }[];
  topRated: { cafeId: string; name: string; avgRating: number; reviewCount: number }[];
  lowRated: { cafeId: string; name: string; avgRating: number; reviewCount: number }[];
  neverVisited: { cafeId: string; name: string }[];
  incompleteListings: { cafeId: string; name: string; missing: string[] }[];
  categoryBreakdown: { category: string; label: string; cafeCount: number; visitCount: number; reviewCount: number }[];
  topSearchTerms: { query: string; count: number; avgResults: number }[];
  zeroResultSearchTerms: { query: string; count: number }[];
  searchesByDay: { date: string; count: number }[];
};

const CANONICAL_CATEGORIES = new Set<string>(CATEGORY_OPTIONS);

// `cafes.category` is a free-text column, not constrained to
// CATEGORY_OPTIONS at the database level — the picker (PlaceCafeForm,
// EditCafeTaxonomy) only ever writes one of the 4 canonical strings, but
// older bulk-imported rows can carry slightly different wording (e.g.
// "Cafe-Style Restaurant / Bar" vs. the canonical "Cafe-Style Bistro &
// Lounge Bar"). Grouping on the raw string turned every such variant into
// its own row, making the category breakdown balloon with near-duplicates
// instead of staying at a useful ~5 rows. Anything that isn't an exact
// match to a canonical category buckets into "Other" instead.
function normalizeCategory(raw: string | null): string {
  if (!raw || !raw.trim()) return "Uncategorized";
  const trimmed = raw.trim();
  return CANONICAL_CATEGORIES.has(trimmed) ? trimmed : "Other";
}

const MIN_REVIEWS_FOR_RATING_LISTS = 2;
const LIST_LIMIT = 10;
const SEARCH_DAYS = 30;

// Admin-only cross-table aggregation — same reasoning as
// app/api/admin/users: every table read here (cafes, reviews,
// visited_cafes, bookmarks, search_logs) restricts a normal caller to
// their own rows or is fully public, neither of which is "every cafe's
// full performance profile" or "everyone's search history," so this goes
// through one reviewed, admin-gated endpoint via the service role rather
// than a standing RLS exception.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = createServiceRoleClient();

  const [{ data: cafes }, { data: reviews }, { data: visited }, { data: bookmarks }, { data: admins }, { data: searches }] =
    await Promise.all([
      service.from("cafes").select("id, name, category, tags, image_url"),
      service.from("reviews").select("cafe_id, rating"),
      service.from("visited_cafes").select("cafe_id"),
      service.from("bookmarks").select("cafe_id"),
      service.from("admins").select("user_id"),
      service
        .from("search_logs")
        .select("query, result_count, created_at")
        .gte("created_at", new Date(Date.now() - SEARCH_DAYS * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  let userCount = 0;
  const adminIds = new Set((admins ?? []).map((a) => a.user_id));
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    userCount += data.users.filter((u) => !adminIds.has(u.id)).length;
    if (data.users.length < 200) break;
  }

  const cafeById = new Map((cafes ?? []).map((c) => [c.id, c]));

  const visitCounts = new Map<string, number>();
  for (const row of visited ?? []) visitCounts.set(row.cafe_id, (visitCounts.get(row.cafe_id) ?? 0) + 1);

  const bookmarkCounts = new Map<string, number>();
  for (const row of bookmarks ?? []) bookmarkCounts.set(row.cafe_id, (bookmarkCounts.get(row.cafe_id) ?? 0) + 1);

  const ratingSums = new Map<string, { sum: number; count: number }>();
  for (const row of reviews ?? []) {
    const entry = ratingSums.get(row.cafe_id) ?? { sum: 0, count: 0 };
    entry.sum += row.rating;
    entry.count += 1;
    ratingSums.set(row.cafe_id, entry);
  }

  const totalRatingSum = [...ratingSums.values()].reduce((sum, e) => sum + e.sum, 0);
  const totalRatingCount = [...ratingSums.values()].reduce((sum, e) => sum + e.count, 0);

  const topVisited = [...visitCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, LIST_LIMIT)
    .map(([cafeId, count]) => ({ cafeId, name: cafeById.get(cafeId)?.name ?? "Unknown cafe", count }));

  const ratedCafes = [...ratingSums.entries()]
    .filter(([, e]) => e.count >= MIN_REVIEWS_FOR_RATING_LISTS)
    .map(([cafeId, e]) => ({
      cafeId,
      name: cafeById.get(cafeId)?.name ?? "Unknown cafe",
      avgRating: Math.round((e.sum / e.count) * 10) / 10,
      reviewCount: e.count,
    }));

  const topRated = [...ratedCafes].sort((a, b) => b.avgRating - a.avgRating).slice(0, LIST_LIMIT);
  const lowRated = [...ratedCafes].sort((a, b) => a.avgRating - b.avgRating).slice(0, LIST_LIMIT);

  const neverVisited = (cafes ?? [])
    .filter((c) => !visitCounts.has(c.id))
    .slice(0, LIST_LIMIT * 2)
    .map((c) => ({ cafeId: c.id, name: c.name }));

  const incompleteListings = (cafes ?? [])
    .map((c) => {
      const missing: string[] = [];
      if (!c.category) missing.push("category");
      if (!c.tags || c.tags.length === 0) missing.push("tags");
      if (!c.image_url) missing.push("photo");
      return { cafeId: c.id, name: c.name, missing };
    })
    .filter((c) => c.missing.length > 0)
    .slice(0, LIST_LIMIT * 2);

  const categoryMap = new Map<string, { cafeCount: number; visitCount: number; reviewCount: number }>();
  for (const cafe of cafes ?? []) {
    const key = normalizeCategory(cafe.category);
    const entry = categoryMap.get(key) ?? { cafeCount: 0, visitCount: 0, reviewCount: 0 };
    entry.cafeCount += 1;
    entry.visitCount += visitCounts.get(cafe.id) ?? 0;
    entry.reviewCount += ratingSums.get(cafe.id)?.count ?? 0;
    categoryMap.set(key, entry);
  }
  const categoryBreakdown = [...categoryMap.entries()]
    .map(([category, stats]) => ({
      category,
      label: category in CATEGORY_SHORT_LABELS ? CATEGORY_SHORT_LABELS[category as Category] : category,
      ...stats,
    }))
    .sort((a, b) => b.cafeCount - a.cafeCount);

  const searchTermStats = new Map<string, { count: number; resultSum: number }>();
  const zeroResultStats = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const row of searches ?? []) {
    const normalized = row.query.trim().toLowerCase();
    if (!normalized) continue;
    const entry = searchTermStats.get(normalized) ?? { count: 0, resultSum: 0 };
    entry.count += 1;
    entry.resultSum += row.result_count;
    searchTermStats.set(normalized, entry);

    if (row.result_count === 0) zeroResultStats.set(normalized, (zeroResultStats.get(normalized) ?? 0) + 1);

    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const topSearchTerms = [...searchTermStats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, LIST_LIMIT)
    .map(([query, stats]) => ({ query, count: stats.count, avgResults: Math.round((stats.resultSum / stats.count) * 10) / 10 }));

  const zeroResultSearchTerms = [...zeroResultStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, LIST_LIMIT)
    .map(([query, count]) => ({ query, count }));

  const searchesByDay = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

  const analytics: AdminAnalytics = {
    totals: {
      cafes: (cafes ?? []).length,
      reviews: (reviews ?? []).length,
      avgRating: totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : null,
      visits: (visited ?? []).length,
      bookmarks: (bookmarks ?? []).length,
      users: userCount,
      searches: (searches ?? []).length,
      zeroResultSearches: (searches ?? []).filter((s) => s.result_count === 0).length,
    },
    topVisited,
    topRated,
    lowRated,
    neverVisited,
    incompleteListings,
    categoryBreakdown,
    topSearchTerms,
    zeroResultSearchTerms,
    searchesByDay,
  };

  return NextResponse.json(analytics);
}
