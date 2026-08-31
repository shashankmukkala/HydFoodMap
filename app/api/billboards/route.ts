import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("billboards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, image_url, lng, lat, elevation_m, width_m, height_m, heading_deg } = body;

  if (!name || typeof lng !== "number" || typeof lat !== "number") {
    return NextResponse.json({ error: "name, lng, and lat are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("billboards")
    .insert({
      name,
      image_url: image_url ?? null,
      lng,
      lat,
      elevation_m: elevation_m ?? 0,
      width_m: width_m ?? 10,
      height_m: height_m ?? 5,
      heading_deg: heading_deg ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
