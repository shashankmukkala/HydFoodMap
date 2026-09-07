import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetReviewsForCafe, localInsertReview } from "@/lib/localReviewStore";
import { localGetAll } from "@/lib/localCafeStore";
import { distanceMeters, VISIT_RADIUS_METERS } from "@/lib/geo";

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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(localGetReviewsForCafe(id));
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("cafe_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
  await authed.from("review_checkins").update({ used_at: new Date().toISOString() }).eq("id", checkin_id).eq("user_id", userData.user.id);
  return NextResponse.json(data, { status: 201 });
}
