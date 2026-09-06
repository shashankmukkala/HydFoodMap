import { NextRequest, NextResponse } from "next/server";
import { createAuthedClient, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { distanceMeters, VISIT_RADIUS_METERS } from "@/lib/geo";

const MAX_LOCATION_ACCURACY_METERS = 150;
const CHECKIN_MINUTES = 10;

async function getUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { token: null, user: null };
  const { data, error } = await supabase.auth.getUser(token);
  return { token, user: error ? null : data.user };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Secure check-in needs Supabase to be configured." }, { status: 503 });
  }

  const { token, user } = await getUser(request);
  if (!token || !user) return NextResponse.json({ error: "Sign in to check in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { lat, lng, accuracy } = body;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof accuracy !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(accuracy) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    accuracy < 0
  ) {
    return NextResponse.json({ error: "A valid precise location is required." }, { status: 400 });
  }
  if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
    return NextResponse.json(
      { error: "Your GPS signal is too approximate. Enable precise location and try again." },
      { status: 403 }
    );
  }

  const { data: cafe, error: cafeError } = await supabase.from("cafes").select("lat, lng").eq("id", id).single();
  if (cafeError || !cafe) return NextResponse.json({ error: "Cafe not found." }, { status: 404 });
  if (distanceMeters({ lat, lng }, { lat: cafe.lat, lng: cafe.lng }) > VISIT_RADIUS_METERS) {
    return NextResponse.json({ error: "You need to be at the cafe to check in." }, { status: 403 });
  }

  const now = Date.now();
  const authed = createAuthedClient(token);
  const { data: checkin, error } = await authed
    .from("review_checkins")
    .insert({
      cafe_id: id,
      user_id: user.id,
      start_lat: lat,
      start_lng: lng,
      start_accuracy: accuracy,
      started_at: new Date(now).toISOString(),
      expires_at: new Date(now + CHECKIN_MINUTES * 60 * 1000).toISOString(),
    })
    .select("id, expires_at")
    .single();

  if (error || !checkin) return NextResponse.json({ error: error?.message || "Couldn't start check-in." }, { status: 500 });
  return NextResponse.json({ checkin_id: checkin.id, expires_at: checkin.expires_at, wait_seconds: 30 }, { status: 201 });
}
