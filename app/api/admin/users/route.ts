import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";

export type AdminUserReview = {
  cafeName: string;
  rating: number;
  comment: string | null;
  favoriteFood: string | null;
  createdAt: string;
};

export type AdminUserSummary = {
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  points: number;
  bookmarksCount: number;
  collectionsCount: number;
  visitedCafeNames: string[];
  reviews: AdminUserReview[];
  banned: boolean;
};

// Admin-only cross-user view — every other place these tables (profiles,
// visited_cafes, points_ledger, reviews, bookmarks, collections) are read
// from, RLS restricts a caller to their own row (`auth.uid() = user_id`),
// by design. There is deliberately no "admins can read everyone's row"
// policy on any of them (unlike ad_enquiries in 0022) — broad visibility
// into every user's activity is exactly the kind of access that should
// go through one reviewed, admin-gated endpoint rather than a standing
// RLS exception every future query against those tables also inherits.
// So this route checks admin membership first (requireAdmin, evaluated
// as the real caller), then deliberately switches to the service role
// client to actually fetch and aggregate everyone's data.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = createServiceRoleClient();

  const [{ data: profiles }, { data: admins }, { data: visited }, { data: points }, { data: reviews }, { data: bookmarks }, { data: collections }, { data: cafes }] =
    await Promise.all([
      service.from("profiles").select("user_id, display_name, avatar_url, created_at"),
      service.from("admins").select("user_id"),
      service.from("visited_cafes").select("user_id, cafe_id"),
      service.from("points_ledger").select("user_id, amount"),
      service.from("reviews").select("user_id, cafe_id, rating, comment, favorite_food, created_at"),
      service.from("bookmarks").select("user_id"),
      service.from("collections").select("user_id"),
      service.from("cafes").select("id, name"),
    ]);

  // Sourced from auth.users, not profiles — an account created before
  // 0024's trigger existed (e.g. the admin account itself, made via
  // scripts/create-admin.mjs pre-Google-sign-in) has no profiles row at
  // all, and starting from profiles silently dropped it from this list
  // entirely rather than showing it with blank name/avatar. Admin
  // accounts (the `admins` table) are filtered out on purpose here —
  // this view is about visitor activity, not the operator's own login.
  const adminIds = new Set((admins ?? []).map((a) => a.user_id));
  const authUsers: { id: string; email: string | null; created_at: string; banned: boolean }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const u of data.users) {
      if (!adminIds.has(u.id)) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
          banned: !!u.banned_until && new Date(u.banned_until).getTime() > Date.now(),
        });
      }
    }
    if (data.users.length < 200) break;
  }

  const profileByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const cafeNameById = new Map<string, string>((cafes ?? []).map((c) => [c.id, c.name]));

  function countBy(rows: { user_id: string }[] | null): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
    return map;
  }

  const bookmarksCounts = countBy(bookmarks);
  const collectionsCounts = countBy(collections);

  const pointsTotals = new Map<string, number>();
  for (const row of points ?? []) {
    pointsTotals.set(row.user_id, (pointsTotals.get(row.user_id) ?? 0) + row.amount);
  }

  const visitedByUser = new Map<string, string[]>();
  for (const row of visited ?? []) {
    const name = cafeNameById.get(row.cafe_id) ?? "Unknown cafe";
    const list = visitedByUser.get(row.user_id) ?? [];
    list.push(name);
    visitedByUser.set(row.user_id, list);
  }

  const reviewsByUser = new Map<string, AdminUserReview[]>();
  for (const row of reviews ?? []) {
    const list = reviewsByUser.get(row.user_id) ?? [];
    list.push({
      cafeName: cafeNameById.get(row.cafe_id) ?? "Unknown cafe",
      rating: row.rating,
      comment: row.comment,
      favoriteFood: row.favorite_food,
      createdAt: row.created_at,
    });
    reviewsByUser.set(row.user_id, list);
  }

  const users: AdminUserSummary[] = authUsers.map((u) => {
    const profile = profileByUserId.get(u.id);
    return {
      userId: u.id,
      email: u.email,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      joinedAt: profile?.created_at ?? u.created_at,
      points: pointsTotals.get(u.id) ?? 0,
      bookmarksCount: bookmarksCounts.get(u.id) ?? 0,
      collectionsCount: collectionsCounts.get(u.id) ?? 0,
      visitedCafeNames: visitedByUser.get(u.id) ?? [],
      reviews: reviewsByUser.get(u.id) ?? [],
      banned: u.banned,
    };
  });

  users.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

  return NextResponse.json(users);
}
