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

  const [{ data: profiles }, { data: admins }, { data: points }, { data: visited }] = await Promise.all([
    service.from("profiles").select("user_id, display_name, avatar_url"),
    service.from("admins").select("user_id"),
    service.from("points_ledger").select("user_id, amount"),
    service.from("visited_cafes").select("user_id"),
  ]);

  const adminIds = new Set((admins ?? []).map((a) => a.user_id));
  const bannedIds = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const u of data.users) {
      if (u.banned_until && new Date(u.banned_until).getTime() > Date.now()) bannedIds.add(u.id);
    }
    if (data.users.length < 200) break;
  }

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

  const ranked = [...eligibleUserIds]
    .filter((id) => !adminIds.has(id) && !bannedIds.has(id))
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
    .sort((a, b) => b.points - a.points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const top = ranked.slice(0, TOP_N);

  // "me" — the caller's own rank, even when it's outside the top N, so
  // /profile can show it without needing a second aggregate query.
  let me: LeaderboardEntry | null = null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData.user) {
      me = ranked.find((entry) => entry.userId === userData.user.id) ?? {
        userId: userData.user.id,
        displayName: profileByUser.get(userData.user.id)?.display_name ?? null,
        avatarUrl: profileByUser.get(userData.user.id)?.avatar_url ?? null,
        points: 0,
        visitedCount: 0,
        rank: ranked.length + 1,
      };
    }
  }

  return NextResponse.json({ top, me });
}
