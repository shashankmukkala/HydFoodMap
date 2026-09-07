import { createServiceRoleClient } from "@/lib/supabase";

export type RecordedVisit = { firstVisit: boolean; pointsAwarded: number };

/**
 * Writes the two visit records that follow an already-verified check-in.
 * The caller is responsible for having validated the check-in first —
 * this function trusts that and does not re-check it.
 *
 * Shared by /api/cafes/[id]/log-visit and /api/cafes/[id]/reviews so that
 * one "genuinely here for 30 seconds" proof covers both. Previously each
 * route ran its own copy, and each consumed the check-in, so a visitor who
 * wanted to log the visit *and* leave a review had to sit through the
 * 30-second dwell twice; posting a review also left the cafe missing from
 * their Visited list, despite the review being stronger proof of presence
 * than the visit toggle ever was.
 *
 * Two writes, both through the service role because neither table has a
 * client insert policy any more (0031, deliberately — a direct insert
 * would bypass the check-in entirely):
 *   - visited_cafes: the "have I ever been here" flag. Upserted, so it
 *     fires award_visit_points only on a genuine first visit.
 *   - visit_log: one row per verified visit, which fires
 *     award_repeat_visit_points — that trigger applies its own 20-hour
 *     cooldown, so nothing here needs to rate-limit return visits.
 */
export async function recordVerifiedVisit(
  userId: string,
  cafeId: string,
  checkinId: string
): Promise<RecordedVisit> {
  const service = createServiceRoleClient();
  const startedAt = new Date().toISOString();

  const { data: firstVisitRow } = await service
    .from("visited_cafes")
    .upsert({ user_id: userId, cafe_id: cafeId }, { onConflict: "user_id,cafe_id", ignoreDuplicates: true })
    .select("user_id")
    .maybeSingle();

  const { error } = await service
    .from("visit_log")
    .insert({ user_id: userId, cafe_id: cafeId, checkin_id: checkinId });
  if (error) throw new Error(error.message);

  // Filtered by reason, not by timestamp alone: when this runs from the
  // reviews route the review/photo rows were written moments earlier for
  // the same user and cafe, and a purely time-based read would count them
  // a second time and report an inflated total to the client.
  const { data: awardedRows } = await service
    .from("points_ledger")
    .select("amount")
    .eq("user_id", userId)
    .eq("cafe_id", cafeId)
    .in("reason", ["visit", "repeat_visit"])
    .gte("created_at", startedAt);

  return {
    firstVisit: !!firstVisitRow,
    pointsAwarded: (awardedRows ?? []).reduce((sum, row) => sum + row.amount, 0),
  };
}
