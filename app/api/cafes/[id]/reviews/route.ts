import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetReviewsForCafe, localInsertReview } from "@/lib/localReviewStore";
import { localGetAll } from "@/lib/localCafeStore";
import { distanceMeters, VISIT_RADIUS_METERS } from "@/lib/geo";

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
  const { rating, comment, favorite_food, photo_url, lat, lng } = body;

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be a number 1-5" }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat/lng are required — reviews must be submitted from the cafe's location" },
      { status: 400 }
    );
  }

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
      comment: comment || null,
      favorite_food: favorite_food || null,
      photo_url: photo_url || null,
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
  const { data, error } = await authed
    .from("reviews")
    .insert({
      cafe_id: id,
      user_id: userData.user.id,
      rating,
      comment: comment || null,
      favorite_food: favorite_food || null,
      photo_url: photo_url || null,
    })
    .select()
    .single();

  if (error) {
    // Unique violation = they've already reviewed this cafe.
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "You've already reviewed this cafe." : error.message;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(data, { status: 201 });
}
