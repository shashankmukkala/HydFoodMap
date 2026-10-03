import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Cafe } from "@/lib/supabase";
import { normalizeCategory } from "@/lib/categories";

// Dev-only fallback so the map shows real data before Supabase is wired up.
// Reads/writes a plain JSON file on disk — great for local development, but
// on a serverless deploy (Vercel etc.) the filesystem outside /tmp is
// read-only, so writes throw. Rather than let that 500 the whole page (the
// map would show zero cafes), writes fall back to an in-memory cache for
// the life of that warm instance. Once NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are
// set, the API routes stop calling this entirely and use the real database.
const STORE_DIR = path.join(process.cwd(), "local-data");
const STORE_PATH = path.join(STORE_DIR, "cafes.json");
/**
 * The curated 85, not scripts/seed-cafes.json.
 *
 * That file is the pre-curation 140-record import, and it is the dataset
 * the whole interface was *not* built for: its categories and its tag
 * vocabulary both predate the current ones, so seeding from it left every
 * Type chip and almost every vibe filter matching nothing, and searching
 * "cafe" or "dessert" returning an empty map. It also has no addresses and
 * no famous-for notes, so detail cards opened half empty.
 *
 * The curated file is what the live database holds: current tags,
 * addresses and notes on all 85, and the five image_urls. Its categories
 * are the slash-form ("Cafe / Bakery / Desserts"), which normalizeCategory
 * resolves the same way 0036 does in Postgres.
 */
const SEED_PATH = path.join(process.cwd(), "scripts", "seed-cafes-curated-86.json");

type SeedCafe = Omit<Cafe, "id" | "created_at">;

// In-memory fallback used only when the filesystem can't be written to
// (e.g. Vercel's read-only deployment filesystem).
let memoryCache: Cafe[] | null = null;

function seedCafes(): Cafe[] {
  if (!existsSync(SEED_PATH)) return [];
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8")) as SeedCafe[];
  const now = new Date().toISOString();
  return seed.map((entry) => ({ ...entry, id: randomUUID(), created_at: now }));
}

function ensureStore(): Cafe[] {
  if (memoryCache) return memoryCache;

  if (existsSync(STORE_PATH)) {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as Cafe[];
  }

  const seeded = seedCafes();
  try {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(seeded, null, 2));
  } catch {
    // Read-only filesystem — keep serving from memory for this instance
    // instead of failing the request.
    memoryCache = seeded;
  }
  return seeded;
}

function writeStore(cafes: Cafe[]) {
  try {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(cafes, null, 2));
    memoryCache = null;
  } catch {
    memoryCache = cafes;
  }
}

export function localGetAll(): Cafe[] {
  return (
    ensureStore()
      // The seed predates 0036, so its categories are the old taxonomy.
      // Normalising here rather than at each call site means the Type
      // filter, search, the map dots and the detail card all see the same
      // values the database would give them — without rewriting the file,
      // which is a fixture and should stay as it is.
      .map((cafe) => ({ ...cafe, category: normalizeCategory(cafe.category) }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  );
}

export function localInsert(input: Partial<Cafe> & { name: string; lng: number; lat: number }): Cafe {
  const cafes = ensureStore();
  const cafe: Cafe = {
    id: randomUUID(),
    name: input.name,
    category: input.category ?? null,
    location: input.location ?? null,
    address: input.address ?? null,
    website_or_instagram: input.website_or_instagram ?? null,
    cost_for_two: input.cost_for_two ?? null,
    note: input.note ?? null,
    lng: input.lng,
    lat: input.lat,
    image_url: input.image_url ?? null,
    tags: input.tags ?? [],
    hours_text: input.hours_text ?? null,
    maps_url: input.maps_url ?? null,
    rating: input.rating ?? null,
    created_at: new Date().toISOString(),
  };
  cafes.unshift(cafe);
  writeStore(cafes);
  return cafe;
}

export function localUpdate(id: string, patch: Partial<Cafe>): Cafe | null {
  const cafes = ensureStore();
  const index = cafes.findIndex((c) => c.id === id);
  if (index === -1) return null;
  cafes[index] = { ...cafes[index], ...patch, id };
  writeStore(cafes);
  return cafes[index];
}

export function localDelete(id: string): boolean {
  const cafes = ensureStore();
  const next = cafes.filter((c) => c.id !== id);
  if (next.length === cafes.length) return false;
  writeStore(next);
  return true;
}
