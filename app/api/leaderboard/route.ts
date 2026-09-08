import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, isSupabaseConfigured, supabase } from "@/lib/supabase";

export type LeaderboardEntry = {
  /**
   * Deliberately no user id. Publishing it gave anyone a key to join this
   * ranking to any other row carrying the same UUID — reviews above all —
   * and so to name the author of a review and list the places they had
   * been. Shortening the display name did not help while the id was the
   * real identifier. The client only needed it to mark its own row, which
   * `isMe` does without exposing anything joinable.
   */
  isMe: boolean;
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
//
// All of the aggregation, the admin exclusion and the ban filter happen
// inside leaderboard_stats() (0038). This route used to read every row of
// profiles, points_ledger and visited_cafes into memory, sum them in JS,
// and then make one auth.admin.getUserById() call per candidate to check
// ban status — three full table scans and ~70 round trips per request,
// including on /profile's lightweight "what's my rank" fetch.
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ top: [], me: null });

  const service = createServiceRoleClient();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Resolving the caller's own id runs in parallel with the aggregate,
  // rather than adding a round trip after it.
  const [{ data: rows, error }, meAuth] = await Promise.all([
    service.rpc("leaderboard_stats"),
    token ? supabase.auth.getUser(token) : Promise.resolve(null),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The caller's own id stays in this scope and is never serialised — it
  // is only used to decide which row gets isMe.
  const meUserId = meAuth?.data.user?.id ?? null;

  // Already ordered by points desc in SQL, so rank is just position.
  const ranked: LeaderboardEntry[] = (rows ?? []).map(
    (
      row: { user_id: string; display_name: string | null; avatar_url: string | null; points: number; visited_count: number },
      i: number
    ) => ({
      isMe: !!meUserId && row.user_id === meUserId,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      points: Number(row.points),
      visitedCount: Number(row.visited_count),
      rank: i + 1,
    })
  );

  const top = ranked.slice(0, TOP_N);

  // "me" — the caller's own rank, even when it's outside the top N, so
  // /profile can show it without needing a second aggregate query. A
  // caller who is absent from the list is either banned or an admin, both
  // of which leaderboard_stats() filters out; returning null is correct
  // for both.
  const me = meUserId ? (ranked.find((entry) => entry.isMe) ?? null) : null;

  return NextResponse.json({ top, me });
}
