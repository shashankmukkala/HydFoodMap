import { NextRequest, NextResponse } from "next/server";

// Proxied server-side per Nominatim's usage policy (nominatim.org/release-docs/latest/api/Search/)
// which requires a valid identifying User-Agent — a bare browser fetch from
// the client is easy to rate-limit/block, and silently returns nothing.
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "HydCafeMap/1.0 (https://github.com/; contact via repo issues)";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  if (lat && lon) return reverseGeocode(lat, lon);

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json([]);
  }

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("viewbox", "78.20,17.60,78.75,17.15");
  url.searchParams.set("bounded", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Geocoding service unreachable" }, { status: 502 });
  }
}

// Turns a lat/lng the admin clicked on the map into a real, human-readable
// address, so pinning a cafe shows *where that actually is* instead of a
// bare pair of coordinates (nothing in the UI otherwise confirms the click
// landed on the intended building).
async function reverseGeocode(lat: string, lon: string) {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "18");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Geocoding service unreachable" }, { status: 502 });
  }
}
