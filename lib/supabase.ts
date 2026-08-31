import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Lazily initialized so builds/pages that don't touch Supabase still work
// before NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project's values."
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver);
  },
});

export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export type Billboard = {
  id: string;
  name: string;
  image_url: string | null;
  lng: number;
  lat: number;
  elevation_m: number;
  width_m: number;
  height_m: number;
  heading_deg: number;
  advertiser_id: string | null;
  created_at: string;
};

export type Cafe = {
  id: string;
  name: string;
  category: string | null;
  /** Neighbourhood/area, e.g. "Banjara Hills" — distinct from the full address. */
  location: string | null;
  /** Display string as entered, e.g. "₹850" — an approximate cost for two. */
  cost_for_two: string | null;
  note: string | null;
  lng: number;
  lat: number;
  image_url: string | null;
  tags: string[];
  hours_text: string | null;
  /**
   * @deprecated Left over from the original data.json import (a Google-sourced
   * rating at seed time). No longer read or written anywhere in the app —
   * displayed ratings are always computed live from the `reviews` table
   * instead, so they reflect real people who actually rated the place here.
   */
  rating: number | null;
  created_at: string;
};

export type CafeEvent = {
  id: string;
  name: string;
  /** ISO date, e.g. "2026-09-14". */
  event_date: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  cafe_id: string;
  rating: number;
  comment: string | null;
  /** What they'd order again — e.g. "Filter coffee" or "Nutella croissant". */
  favorite_food: string | null;
  /** Data URL of an optional photo attached to the review. */
  photo_url: string | null;
  /**
   * @deprecated No longer collected in the UI — identity will come from
   * mobile-number sign-in instead once that's wired up. Left nullable so
   * old rows still read fine.
   */
  reviewer_name: string | null;
  created_at: string;
};
