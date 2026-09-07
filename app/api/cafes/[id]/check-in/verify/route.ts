import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { distanceMeters, VISIT_RADIUS_METERS } from "@/lib/geo";

const MAX_LOCATION_ACCURACY_METERS = 150;
const MIN_DWELL_SECONDS = 30;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Secure check-in is unavailable." }, { status: 503 });

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Sign in to verify your check-in." }, { status: 401 });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { checkin_id, lat, lng, accuracy } = body;
  if (
    typeof checkin_id !== "string" ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof accuracy !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(accuracy) ||
    accuracy < 0
  ) {
    return NextResponse.json({ error: "A valid check-in and precise location are required." }, { status: 400 });
  }
  if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
    return NextResponse.json({ error: "Your GPS signal is too approximate. Try again with precise location." }, { status: 403 });
  }

  const authed = createAuthedClient(token);
  const { data: checkin, error } = await authed
    .from("review_checkins")
    .select("id, cafe_id, started_at, expires_at, verified_at, used_at")
    .eq("id", checkin_id)
    .eq("cafe_id", id)
    .eq("user_id", userData.user.id)
    .single();
  if (error || !checkin) return NextResponse.json({ error: "Check-in not found." }, { status: 404 });
  if (checkin.used_at) return NextResponse.json({ error: "This check-in has already been used." }, { status: 409 });
  if (checkin.verified_at) return NextResponse.json({ checkin_id: checkin.id }, { status: 200 });
  if (new Date(checkin.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Check-in expired. Please start again." }, { status: 410 });
  if (Date.now() - new Date(checkin.started_at).getTime() < MIN_DWELL_SECONDS * 1000) {
    return NextResponse.json({ error: "Please stay at the cafe a little longer before continuing." }, { status: 425 });
  }

  const { data: cafe, error: cafeError } = await supabase.from("cafes").select("lat, lng").eq("id", id).single();
  if (cafeError || !cafe) return NextResponse.json({ error: "Cafe not found." }, { status: 404 });
  if (distanceMeters({ lat, lng }, { lat: cafe.lat, lng: cafe.lng }) > VISIT_RADIUS_METERS) {
    return NextResponse.json({ error: "You are no longer close enough to verify this visit." }, { status: 403 });
  }

  const { error: updateError } = await authed
    .from("review_checkins")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", checkin.id)
    .eq("user_id", userData.user.id)
    .is("verified_at", null);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ checkin_id: checkin.id }, { status: 200 });
}
