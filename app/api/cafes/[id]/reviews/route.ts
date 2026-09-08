import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient, createServiceRoleClient, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetReviewsForCafe, localInsertReview } from "@/lib/localReviewStore";
import { localGetAll } from "@/lib/localCafeStore";
import { distanceMeters, VISIT_RADIUS_METERS } from "@/lib/geo";
import { recordVerifiedVisit } from "@/lib/recordVisit";

const MAX_LOCATION_ACCURACY_METERS = 150;
const MAX_COMMENT_LENGTH = 1200;
const MAX_FAVORITE_FOOD_LENGTH = 120;
const MAX_PHOTO_DATA_LENGTH = 1_500_000;

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return { error: "Review text must be a string." } as const;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return { error: `Review text must be ${maxLength} characters or less.` } as const;
  return trimmed || null;
}

/**
 * A review as the public is allowed to see it.
 *
 * Deliberately no `user_id`. A review says a named account stood inside a
 * specific building at a specific time, and publishing the UUID alongside
 * it let anyone join these rows to /api/leaderboard and name the author of
 * every review, plus every place they had been. `isMine` carries the one
 * thing the client actually needed the id for.
 */
export type PublicReview = {
  id: string;
  cafe_id: string;
  rating: number;
  comment: string | null;
  favorite_food: string | null;
  photo_url: string | null;
  created_at: string;
  authorName: string | null;
  isMine: boolean;
  /**
   * Whether a GPS check-in backs this review. The check-in id itself is
   * internal and stays server-side — the badge only needs the fact.
   */
  isVerified: boolean;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(localGetReviewsForCafe(id));
  }

  // Service role because 0040 removed the public read policy: reviews are
  // still public content, but what "public" means is decided here rather
  // than by handing out the raw row.
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("reviews")
    .select("id, cafe_id, user_id, rating, comment, favorite_food, photo_url, created_at, checkin_id")
    .eq("cafe_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Author names come from profiles, shortened by the same function the
  // leaderboard uses, so a reviewer is identified the same way in both
  // places and neither is the weaker link.
  const authorIds = [...new Set(rows.map((r) => r.user_id))];
  const names = new Map<string, string | null>();
  if (authorIds.length > 0) {
    const { data: profiles } = await service.rpc("public_display_names", { ids: authorIds });
    for (const row of profiles ?? []) names.set(row.user_id, row.display_name);
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let callerId: string | null = null;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    callerId = userData.user?.id ?? null;
  }

  const publicReviews: PublicReview[] = rows.map((row) => ({
    id: row.id,
    cafe_id: row.cafe_id,
    rating: row.rating,
    comment: row.comment,
    favorite_food: row.favorite_food,
    photo_url: row.photo_url,
    created_at: row.created_at,
    authorName: names.get(row.user_id) ?? null,
    isMine: !!callerId && row.user_id === callerId,
    isVerified: !!row.checkin_id,
  }));

  return NextResponse.json(publicReviews);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { rating, comment, favorite_food, photo_url, lat, lng, accuracy, checkin_id } = body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: "lat/lng are required — reviews must be submitted from the cafe's location" },
      { status: 400 }
    );
  }
  if (typeof accuracy !== "number" || !Number.isFinite(accuracy) || accuracy < 0) {
    return NextResponse.json({ error: "A valid GPS accuracy reading is required." }, { status: 400 });
  }
  if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
    return NextResponse.json(
      { error: "Your GPS signal is too approximate. Move outside or enable precise location and try again." },
      { status: 403 }
    );
  }

  const safeComment = optionalText(comment, MAX_COMMENT_LENGTH);
  const safeFavoriteFood = optionalText(favorite_food, MAX_FAVORITE_FOOD_LENGTH);
  if (typeof safeComment !== "string" && safeComment !== null) {
    return NextResponse.json({ error: safeComment.error }, { status: 400 });
  }
  if (typeof safeFavoriteFood !== "string" && safeFavoriteFood !== null) {
    return NextResponse.json({ error: safeFavoriteFood.error }, { status: 400 });
  }
  if (photo_url !== undefined && photo_url !== null && photo_url !== "") {
    if (
      typeof photo_url !== "string" ||
      !photo_url.startsWith("data:image/") ||
      photo_url.length > MAX_PHOTO_DATA_LENGTH
    ) {
      return NextResponse.json({ error: "Photo must be a supported image under 1 MB." }, { status: 400 });
    }
  }
  const safePhotoUrl = photo_url || null;

  if (!isSupabaseConfigured()) {
    const cafe = localGetAll().find((c) => c.id === id);
    if (!cafe) return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    if (distanceMeters({ lat, lng }, { lat: cafe.lat, lng: cafe.lng }) > VISIT_RADIUS_METERS) {
      return NextResponse.json({ error: "You need to be at the cafe to leave a review." }, { status: 403 });
    }
    const review = localInsertReview({
      cafe_id: id,
      user_id: "local-dev",
      rating,
      comment: safeComment,
      favorite_food: safeFavoriteFood,
      photo_url: safePhotoUrl,
      reviewer_name: null,
    });
    return NextResponse.json(review, { status: 201 });
  }

  // Real reviews require a signed-in identity — no anonymous/scripted
  // review spam. The client sends its Supabase access token; we verify it
  // server-side rather than trusting a client-supplied user id.
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Your session has expired — sign in again." }, { status: 401 });
  }

  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .select("lat, lng")
    .eq("id", id)
    .single();
  if (cafeError || !cafe) return NextResponse.json({ error: "Cafe not found" }, { status: 404 });

  if (distanceMeters({ lat, lng }, { lat: cafe.lat, lng: cafe.lng }) > VISIT_RADIUS_METERS) {
    return NextResponse.json({ error: "You need to be at the cafe to leave a review." }, { status: 403 });
  }

  const authed = createAuthedClient(token);
  if (typeof checkin_id !== "string") {
    return NextResponse.json({ error: "Complete the cafe check-in before posting a review." }, { status: 400 });
  }

  const { data: checkin, error: checkinError } = await authed
    .from("review_checkins")
    .select("id, expires_at, verified_at, used_at")
    .eq("id", checkin_id)
    .eq("cafe_id", id)
    .eq("user_id", userData.user.id)
    .single();
  if (checkinError || !checkin) return NextResponse.json({ error: "Verified check-in not found." }, { status: 403 });
  if (!checkin.verified_at || checkin.used_at || new Date(checkin.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Your cafe check-in is not valid for a review." }, { status: 403 });
  }

  const { data, error } = await authed
    .from("reviews")
    .insert({
      cafe_id: id,
      user_id: userData.user.id,
      rating,
      comment: safeComment,
      favorite_food: safeFavoriteFood,
      photo_url: safePhotoUrl,
      checkin_id,
    })
    .select()
    .single();

  if (error) {
    // Unique violation = they've already reviewed this cafe.
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "You've already reviewed this cafe." : error.message;
    return NextResponse.json({ error: message }, { status });
  }
  // A verified review is stronger proof of presence than the visit
  // check-in is, so it records the visit too — the cafe now shows up in
  // Visited, and the same one check-in covers both. Deliberately not
  // fatal: the review is the primary action and is already saved, so a
  // failure here should not fail the request or lose the visitor's
  // writing. The check-in is left unconsumed in that case, which is the
  // useful outcome — they can still spend it on a plain visit.
  let visitPoints = 0;
  try {
    const visit = await recordVerifiedVisit(userData.user.id, id, checkin_id);
    visitPoints = visit.pointsAwarded;
    await authed.from("review_checkins").update({ used_at: new Date().toISOString() }).eq("id", checkin_id).eq("user_id", userData.user.id);
  } catch (err) {
    console.error("reviews: review saved but visit could not be recorded", err);
  }

  // award_review_points() (0029) already ran as part of the insert above
  // (an AFTER INSERT trigger fires within the same statement) — read back
  // what it actually awarded (review + photo, if any) so the client can
  // show the real number instead of a guessed/hardcoded one. The visit
  // and repeat-visit awards from recordVerifiedVisit are counted
  // separately, since those rows carry no review_id.
  const { data: awarded } = await authed.from("points_ledger").select("amount").eq("review_id", data.id);
  const pointsAwarded = (awarded ?? []).reduce((sum, row) => sum + row.amount, 0) + visitPoints;

  // Returned in the same shape GET uses, for two reasons. It keeps the
  // author's user_id out of the response — the caller's own id, but still
  // the join key this change exists to stop publishing. And the client
  // pushes this straight into its list, so a raw row would render without
  // the verified badge or the author name until the next reload.
  const { data: authorRows } = await createServiceRoleClient().rpc("public_display_names", {
    ids: [userData.user.id],
  });
  const created: PublicReview = {
    id: data.id,
    cafe_id: data.cafe_id,
    rating: data.rating,
    comment: data.comment,
    favorite_food: data.favorite_food,
    photo_url: data.photo_url,
    created_at: data.created_at,
    authorName: authorRows?.[0]?.display_name ?? null,
    isMine: true,
    isVerified: !!data.checkin_id,
  };

  return NextResponse.json({ ...created, points_awarded: pointsAwarded }, { status: 201 });
}
