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

let adminClient: SupabaseClient | null = null;

// A second, fully separate Supabase Auth session from the public
// `supabase` client above — same project, different `storageKey`, so the
// browser keeps two independent sessions side by side instead of one
// shared one. Without this, signing into /admin (email+password) and
// browsing the public map (Google) fought over the same localStorage
// session: whichever signed in most recently "won", the admin operator's
// account started showing up as a signed-in visitor on the public site,
// and signing out of either logged both out. Used only by
// lib/useAdminAuth.ts and the admin-only routes/components that read its
// token — every visitor-facing hook (useAuth, useVisitTracking,
// usePoints, ...) keeps using the plain `supabase` client above.
function getAdminSupabase(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project's values."
    );
  }

  adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storageKey: "hydcafemap-admin-auth" },
  });
  return adminClient;
}

export const adminSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdminSupabase(), prop, receiver);
  },
});

export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// A request-scoped client that forwards the signed-in user's access token,
// so Postgres RLS policies that check auth.uid() (e.g. "users write their
// own reviews") evaluate against that real user — not an anonymous
// service-level connection. Used server-side in API routes; never cached,
// since it's specific to one request's caller.
export function createAuthedClient(accessToken: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Bypasses RLS entirely — the service role is a full-trust connection,
// same as the Postgres superuser as far as PostgREST is concerned. Only
// ever call this from server-side code that has already independently
// verified what it's about to do (e.g. app/api/admin/reset-password,
// which checks a hashed recovery code before touching anything). Safe to
// export from this shared module despite that: SUPABASE_SERVICE_ROLE_KEY
// is a server-only env var (no NEXT_PUBLIC_ prefix), so Next.js never
// bundles it into client-side JS regardless of what imports this file.
export function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type Billboard = {
  id: string;
  name: string;
  ad_type: "billboard" | "aircraft" | "rail";
  slot_number: number | null;
  image_url: string | null;
  target_url: string | null;
  /** ISO date, e.g. "2026-09-14" — when this placement's campaign ends,
   *  set (optionally) at creation via PlaceRailAdForm/PlaceBillboardForm.
   *  Null for placements without a known end date. */
  campaign_end: string | null;
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
  /** Full street address for the cafe. */
  address: string | null;
  /** Primary public website or social profile supplied for the cafe. */
  website_or_instagram: string | null;
  /** Display string as entered, e.g. "₹850" — an approximate cost for two. */
  cost_for_two: string | null;
  note: string | null;
  lng: number;
  lat: number;
  image_url: string | null;
  tags: string[];
  hours_text: string | null;
  /**
   * Google's own Maps link for this cafe (place link or search query, from
   * new_data.json's `url` field) — used for the "Directions" button
   * instead of building a link from lng/lat, since our own geocoding can
   * be road-level accurate rather than building-level for addresses with
   * no plot number. Null for cafes with no source URL (e.g. admin-pinned).
   */
  maps_url: string | null;
  /**
   * A Google-sourced rating carried over from new_data.json at seed time —
   * NOT a verified rating (no real visit/review behind it). Internal use
   * only: default ordering/ranking before a cafe has real reviews, etc.
   * Never render this as a user-facing rating — the "Reviews here are
   * verified" promise (see OnboardingBanner) means any rating shown to
   * users must come from the `reviews` table, computed live from real,
   * location-verified reviews, same as ReviewsSection already does.
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
  checkin_id?: string | null;
  user_id: string;
  rating: number;
  comment: string | null;
  /** What they'd order again — e.g. "Filter coffee" or "Nutella croissant". */
  favorite_food: string | null;
  /** Data URL of an optional photo attached to the review. */
  photo_url: string | null;
  /**
   * @deprecated No longer collected in the UI — identity comes from the
   * signed-in Google account (see lib/useAuth, Profile below) instead.
   * Left nullable so old rows still read fine.
   */
  reviewer_name: string | null;
  created_at: string;
};

// One row per signed-in user (0024_profiles.sql), auto-created from
// Google's own profile data by a database trigger the moment their
// auth.users row appears — never created client-side.
export type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};
