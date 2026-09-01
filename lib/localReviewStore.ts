import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Review } from "@/lib/supabase";

// Dev-only fallback, same pattern as lib/localCafeStore.ts. On a serverless
// deploy (Vercel etc.) the filesystem outside /tmp is read-only, so writes
// fall back to an in-memory cache instead of throwing.
const STORE_DIR = path.join(process.cwd(), "local-data");
const STORE_PATH = path.join(STORE_DIR, "reviews.json");

let memoryCache: Review[] | null = null;

function ensureStore(): Review[] {
  if (memoryCache) return memoryCache;

  if (existsSync(STORE_PATH)) {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as Review[];
  }

  try {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_PATH, "[]");
  } catch {
    memoryCache = [];
  }
  return [];
}

function writeStore(reviews: Review[]) {
  try {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(reviews, null, 2));
    memoryCache = null;
  } catch {
    memoryCache = reviews;
  }
}

export function localGetReviewsForCafe(cafeId: string): Review[] {
  return ensureStore()
    .filter((r) => r.cafe_id === cafeId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function localInsertReview(input: {
  cafe_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  favorite_food: string | null;
  photo_url: string | null;
  reviewer_name: string | null;
}): Review {
  const reviews = ensureStore();
  const review: Review = {
    id: randomUUID(),
    cafe_id: input.cafe_id,
    user_id: input.user_id,
    rating: input.rating,
    comment: input.comment,
    favorite_food: input.favorite_food,
    photo_url: input.photo_url,
    reviewer_name: input.reviewer_name,
    created_at: new Date().toISOString(),
  };
  reviews.push(review);
  writeStore(reviews);
  return review;
}
