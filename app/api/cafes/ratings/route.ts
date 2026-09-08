import { NextResponse } from "next/server";
import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase";

export type CafeRating = { avg: number; count: number };

// Bulk average rating + review count per cafe, so the map can filter/sort
// by rating without opening every cafe's detail card (which fetches its
// own review list). Computed in JS from all rows rather than a DB view —
// simplest option at this data size (hundreds of cafes, so far zero to a
// few thousand reviews).
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({});
  }

  // Service role: 0040 removed the public read policy on reviews, so the
  // anon client can no longer aggregate them. Only the average and count
  // leave this route — no user_id, nothing that identifies a reviewer.
  const service = createServiceRoleClient();
  const { data, error } = await service.from("reviews").select("cafe_id, rating");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byCafe: Record<string, { sum: number; count: number }> = {};
  for (const row of data ?? []) {
    const entry = (byCafe[row.cafe_id] ??= { sum: 0, count: 0 });
    entry.sum += row.rating;
    entry.count += 1;
  }

  const result: Record<string, CafeRating> = {};
  for (const [cafeId, { sum, count }] of Object.entries(byCafe)) {
    result[cafeId] = { avg: sum / count, count };
  }

  return NextResponse.json(result);
}
