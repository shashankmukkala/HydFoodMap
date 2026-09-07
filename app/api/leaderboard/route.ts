import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, isSupabaseConfigured, supabase } from "@/lib/supabase";

export type LeaderboardEntry = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  visitedCount: number;
  rank: number;
};

const TOP_N = 50;

// Public (any visitor can see who's leading), but never exposes email —
// unlike app/api/admin/users this isn't an admin-only aggregate, it's a
// social feature, so it's deliberately limited to display name/avatar/
// points/rank. Admin accounts are excluded (this ranks visitor activity,
// same reasoning as the admin/users list), and so is anyone currently
// banned.
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ top: [], me: null });

  const service = createServiceRoleClient();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Resolving the caller's own id runs in parallel with the aggregate
  // queries below (used to be a separate awaited call after everything
  // else finished, adding a full extra round trip to every request).
  const [{ data: profiles }, { data: admins }, { data: points }, { data: visited }, meAuth] = await Promise.all([
    service.from("profiles").select("user_id, display_name, avatar_url"),
    service.from("admins").select("user_id"),
    service.from("points_ledger").select("user_id, amount"),
    service.from("visited_cafes").select("user_id"),
    token ? supabase.auth.getUser(token) : Promise.resolve(null),
  ]);

  const adminIds = new Set((admins ?? []).map((a) => a.user_id));

  const pointsByUser = new Map<string, number>();
  for (const row of points ?? []) {
    pointsByUser.set(row.user_id, (pointsByUser.get(row.user_id) ?? 0) + row.amount);
  }
  const visitedByUser = new Map<string, number>();
  for (const row of visited ?? []) {
    visitedByUser.set(row.user_id, (visitedByUser.get(row.user_id) ?? 0) + 1);
  }

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const eligibleUserIds = new Set([...pointsByUser.keys(), ...profileByUser.keys()]);

  const rankedAll = [...eligibleUserIds]
    .filter((id) => !adminIds.has(id))
    .map((userId) => {
      const profile = profileByUser.get(userId);
      return {
        userId,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        points: pointsByUser.get(userId) ?? 0,
        visitedCount: visitedByUser.get(userId) ?? 0,
      };
    })
    .sort((a, b) => b.points - a.points);

  const meUserId = meAuth?.data.user?.id ?? null;

  // Only check ban status for accounts that could actually end up in the
  // response (top N + a little slack for anyone who turns out banned,
  // plus the caller) — a full auth.admin.listUsers() pagination loop over
  // *every* account used to run on every single call to this route,
  // including /profile's lightweight "what's my rank" fetch, and that
  // Admin API pagination was the slow part, not the Postgres queries
  // above. This bounds it to a handful of parallel single-user lookups
  // instead of scanning the whole user base every time.
  const candidateIds = new Set(rankedAll.slice(0, TOP_N + 20).map((e) => e.userId));
  if (meUserId) candidateIds.add(meUserId);
  const banned = await Promise.all(
    [...candidateIds].map(async (id) => {
      const { data } = await service.auth.admin.getUserById(id);
      const bannedUntil = data.user?.banned_until;
      return [id, !!bannedUntil && new Date(bannedUntil).getTime() > Date.now()] as const;
    })
  );
  const bannedIds = new Set(banned.filter(([, isBanned]) => isBanned).map(([id]) => id));

  const ranked = rankedAll
    .filter((entry) => !bannedIds.has(entry.userId))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const top = ranked.slice(0, TOP_N);

  // "me" — the caller's own rank, even when it's outside the top N, so
  // /profile can show it without needing a second aggregate query.
  let me: LeaderboardEntry | null = null;
  if (meUserId && !bannedIds.has(meUserId)) {
    me = ranked.find((entry) => entry.userId === meUserId) ?? {
      userId: meUserId,
      displayName: profileByUser.get(meUserId)?.display_name ?? null,
      avatarUrl: profileByUser.get(meUserId)?.avatar_url ?? null,
      points: 0,
      visitedCount: 0,
      rank: ranked.length + 1,
    };
  }

  return NextResponse.json({ top, me });
}
