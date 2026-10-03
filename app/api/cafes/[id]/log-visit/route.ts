import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { recordVerifiedVisit } from "@/lib/recordVisit";
import { enforceRateLimit, HOUR } from "@/lib/rateLimit";

// Records a GPS-verified visit — the client must already hold a verified,
// unused check-in from /api/cafes/[id]/check-in{,/verify} (the exact same
// flow reviews use, see lib/useLocationCheckin.ts). This replaces the old
// blind "Visited ✓" toggle, which had no proof behind it at all (see
// 0031_verified_repeat_visits.sql for why that made rewarding repeat
// visits pointless — nothing stopped a toggle-farm).
//
// Two writes, both via the service role (visited_cafes and visit_log no
// longer have a client insert policy, on purpose — see 0031): the
// "have I ever been here" flag (visited_cafes, upserted, fires
// award_visit_points on a genuine first insert) and a full visit event
// (visit_log, always inserted, fires award_repeat_visit_points which
// checks the 20-hour cooldown itself).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Visit logging needs Supabase to be configured." }, { status: 503 });

  // Each accepted call writes two rows (visited_cafes, visit_log) and
  // fires two points triggers. The 20-hour repeat-visit cooldown in 0031
  // caps what a caller can *earn*, but not what they can make this route
  // do — the cooldown is checked inside the trigger, after the inserts
  // have already been attempted. Thirty an hour is far above any real
  // sequence of visits and retries.
  const limited = enforceRateLimit(request, "log-visit", 30, HOUR, "Too many visit logs. Try again shortly.");
  if (limited) return limited;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Sign in to log a visit." }, { status: 401 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Your session has expired — sign in again." }, { status: 401 });
  }

  const { checkin_id: checkinId } = await request.json().catch(() => ({ checkin_id: null }));
  if (typeof checkinId !== "string") {
    return NextResponse.json({ error: "Complete the location check-in before logging a visit." }, { status: 400 });
  }

  const authed = createAuthedClient(token);
  const { data: checkin, error: checkinError } = await authed
    .from("review_checkins")
    .select("id, expires_at, verified_at, used_at")
    .eq("id", checkinId)
    .eq("cafe_id", id)
    .eq("user_id", userData.user.id)
    .single();
  if (checkinError || !checkin) return NextResponse.json({ error: "Verified check-in not found." }, { status: 403 });
  if (!checkin.verified_at || checkin.used_at || new Date(checkin.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Your check-in is not valid for a visit." }, { status: 403 });
  }

  // The check-in is consumed only after the visit is safely recorded.
  // Marking it used first meant a failure on either write below burned the
  // proof anyway, leaving the visitor to stand through another 30-second
  // dwell for a visit they had already genuinely earned.
  let visit;
  try {
    visit = await recordVerifiedVisit(userData.user.id, id, checkinId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't record that visit." },
      { status: 500 }
    );
  }

  await authed.from("review_checkins").update({ used_at: new Date().toISOString() }).eq("id", checkinId).eq("user_id", userData.user.id);

  return NextResponse.json({ ok: true, firstVisit: visit.firstVisit, points_awarded: visit.pointsAwarded });
}
