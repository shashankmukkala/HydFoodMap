import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetReviewsForCafe, localInsertReview } from "@/lib/localReviewStore";

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
  const { rating, comment, favorite_food, photo_url, reviewer_name } = body;

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be a number 1-5" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const review = localInsertReview({
      cafe_id: id,
      rating,
      comment: comment || null,
      favorite_food: favorite_food || null,
      photo_url: photo_url || null,
      reviewer_name: reviewer_name || null,
    });
    return NextResponse.json(review, { status: 201 });
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      cafe_id: id,
      rating,
      comment: comment || null,
      favorite_food: favorite_food || null,
      photo_url: photo_url || null,
      reviewer_name: reviewer_name || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
