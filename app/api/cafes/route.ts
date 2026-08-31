import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetAll, localInsert } from "@/lib/localCafeStore";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(localGetAll());
  }

  const { data, error } = await supabase
    .from("cafes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(localGetAll());
  }

  if (!data || data.length === 0) {
    return NextResponse.json(localGetAll());
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category, location, cost_for_two, note, lng, lat, image_url, tags, hours_text } = body;

  if (!name || typeof lng !== "number" || typeof lat !== "number") {
    return NextResponse.json({ error: "name, lng, and lat are required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const cafe = localInsert({
      name,
      category: category || null,
      location: location || null,
      cost_for_two: cost_for_two || null,
      note: note || null,
      lng,
      lat,
      image_url: image_url || null,
      tags: Array.isArray(tags) ? tags : [],
      hours_text: hours_text || null,
    });
    return NextResponse.json(cafe, { status: 201 });
  }

  const { data, error } = await supabase
    .from("cafes")
    .insert({
      name,
      category,
      location: location || null,
      cost_for_two: cost_for_two || null,
      note,
      lng,
      lat,
      image_url: image_url || null,
      tags: Array.isArray(tags) ? tags : [],
      hours_text: hours_text || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
