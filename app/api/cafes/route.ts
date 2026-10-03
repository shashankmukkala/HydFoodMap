import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetAll, localInsert } from "@/lib/localCafeStore";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  // The local store is the *unconfigured* case only: a fresh clone with no
  // .env.local, so the map has something to draw. It is a dev convenience.
  if (!isSupabaseConfigured()) {
    return NextResponse.json(localGetAll());
  }

  const { data, error } = await supabase
    .from("cafes")
    .select("*")
    .order("created_at", { ascending: false });

  // This used to fall through to localGetAll() on any error, and again on
  // an empty table. Both were silent, and both were worse than failing:
  // the seed file is a stale snapshot with no photos, no addresses and
  // places that have since been removed or corrected (0041), so a
  // Supabase outage served a map that looked completely normal and was
  // wrong — admin edits apparently reverted, deleted cafes reappeared, and
  // nothing anywhere said the database was down. An error the client can
  // see is recoverable; confident wrong data is not.
  if (error) {
    console.error("[/api/cafes] Supabase read failed:", error.message);

    // Development keeps the seed fallback, because a developer whose
    // network cannot reach Supabase at all still has to be able to work on
    // the map. What made the old behaviour wrong was not the fallback — it
    // was that the fallback was silent and shipped to real users. Here it
    // is loud and cannot reach production.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[/api/cafes] DEV FALLBACK: serving scripts/seed-cafes.json instead. " +
          "This data is STALE — no photos, no addresses, and it still contains places " +
          "that have since been removed or relocated. Production returns 503 here."
      );
      return NextResponse.json(localGetAll());
    }

    return NextResponse.json(
      { error: "Cafes are temporarily unavailable." },
      { status: 503, headers: { "Retry-After": "30" } }
    );
  }

  // An empty table is a legitimate answer, not a failure. Returning [] lets
  // the client say "no cafes yet" instead of quietly showing 140 seeded
  // ones that are not in the database.
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category, location, address, website_or_instagram, cost_for_two, note, lng, lat, image_url, tags, hours_text, maps_url, rating } =
    body;

  if (!name || typeof lng !== "number" || typeof lat !== "number") {
    return NextResponse.json({ error: "name, lng, and lat are required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const cafe = localInsert({
      name,
      category: category || null,
      location: location || null,
      address: address || null,
      website_or_instagram: website_or_instagram || null,
      cost_for_two: cost_for_two || null,
      note: note || null,
      lng,
      lat,
      image_url: image_url || null,
      tags: Array.isArray(tags) ? tags : [],
      hours_text: hours_text || null,
      maps_url: maps_url || null,
      rating: typeof rating === "number" ? rating : null,
    });
    return NextResponse.json(cafe, { status: 201 });
  }

  // Pinning a cafe is an admin action. This route was open, and the
  // table's RLS was too (0001), so anyone holding the public anon key
  // could add pins to the map — 0037 closes the table, this closes the route.
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.client
    .from("cafes")
    .insert({
      name,
      category,
      location: location || null,
      address: address || null,
      website_or_instagram: website_or_instagram || null,
      cost_for_two: cost_for_two || null,
      note,
      lng,
      lat,
      image_url: image_url || null,
      tags: Array.isArray(tags) ? tags : [],
      hours_text: hours_text || null,
      maps_url: maps_url || null,
      rating: typeof rating === "number" ? rating : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
