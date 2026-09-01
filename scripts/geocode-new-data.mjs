// Replaces scripts/geocode-cafes.mjs + data.json as the source of truth.
// new_data.json is the curated, final list of Hyderabad cafes (140 active
// entries) — this turns it into scripts/seed-cafes.json the same way the
// old pipeline did, but from the new source: 37 entries have lat/lng
// embedded in their Google Maps URL ("...!3d{lat}!4d{lng}...") and are
// used directly; the rest are geocoded via Nominatim, throttled to
// roughly one request/second with an identifying User-Agent per
// Nominatim's usage policy.
//
// Tags: new_data.json's `tags` field carries dozens of one-off
// promotional phrases specific to a single cafe (e.g. "Famous Banana
// Pudding") alongside real recurring vibe/cuisine tags. Only tags present
// in lib/tags.ts's curated TAG_OPTIONS are kept — the rest are dropped
// rather than exploding the filter UI with one-cafe chips. "Live Grill
// Table" and "Live Table Grill" (the same idea, inconsistently worded in
// the source data) are normalized to the single "Live Grill" tag.
//
// Output: scripts/seed-cafes.json — run scripts/post-seed.mjs against it
// once Supabase is configured to actually populate the database.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");

const USER_AGENT = "HydCafeMap/1.0 (one-time seed geocoding; contact via repo issues)";
const COORD_RE = /!3d(-?[\d.]+)!4d(-?[\d.]+)/;

const KNOWN_TAGS = new Set([
  "Indoor",
  "Outdoor",
  "Rooftop",
  "Quiet",
  "Lively",
  "Pet Friendly",
  "Work Friendly",
  "Budget",
  "Mid-range",
  "Premium",
  "Cafe Food & Coffee",
  "Specialty Coffee",
  "Desserts & Bakes",
  "Desserts & Gelato",
  "Organic & Natural",
  "Fresh Fruit Ice Creams",
  "Artisanal Creamery",
  "Gourmet Desserts",
  "Multi-cuisine",
  "Fast Food & Pizza",
  "Barbecue & Grills",
  "Bistro Bites & Drinks",
  "Chai & High Tea",
  "Unlimited Buffet",
  "Live Grill",
  "5-Star Luxury Buffet",
  "24/7 Open",
  "Late Night",
  "Serves Alcohol",
]);

const TAG_ALIASES = {
  "Live Grill Table": "Live Grill",
  "Live Table Grill": "Live Grill",
  "Live Grills": "Live Grill",
};

function curatedTags(rawTags) {
  const mapped = (rawTags ?? []).map((t) => TAG_ALIASES[t] ?? t);
  return [...new Set(mapped.filter((t) => KNOWN_TAGS.has(t)))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POI-class results (an actual indexed business — a café, restaurant,
// shop, etc.) land on the real building. Non-POI classes (highway, place,
// building-without-a-name) are just the geocoder's best guess at where a
// text string points, which for an address missing a plot/door number is
// often only a road midpoint — nowhere near the actual venue. This is
// exactly what went wrong for one cafe whose only address was "Road 1,
// Film Nagar, Jubilee Hills" (no plot number): the address query happily
// returned a point on that road, and the old version of this script
// accepted it without ever trying a business-name search, which is why
// preferPoi mode exists — it require a POI, not just any result.
const POI_CLASSES = new Set(["amenity", "shop", "tourism", "leisure", "craft"]);

async function geocodeOnce(query, { retriesLeft = 2, preferPoi = false } = {}) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", preferPoi ? "5" : "1");
  url.searchParams.set("viewbox", "78.20,17.60,78.75,17.15");
  url.searchParams.set("bounded", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (res.status === 429) {
    if (retriesLeft <= 0) throw new Error("Nominatim 429 (rate limited, retries exhausted)");
    await sleep(8000);
    return geocodeOnce(query, { retriesLeft: retriesLeft - 1, preferPoi });
  }
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  if (preferPoi) {
    const poi = data.find((d) => POI_CLASSES.has(d.class));
    if (!poi) return null; // no real business match — let the caller fall back to address geocoding
    return { lat: parseFloat(poi.lat), lng: parseFloat(poi.lon) };
  }

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// Business name first (only accepted if it lands on a real indexed POI —
// see preferPoi above), THEN the address chain as a fallback: full
// address -> business name + neighborhood (as a plain, non-POI-required
// query this time) -> neighborhood alone. Full structured addresses
// (plot/floor/building numbers) mostly fail against Nominatim's free-text
// geocoder anyway — Indian OSM coverage at that granularity is thin — so
// even the "fallback" tier is itself already a fallback chain.
async function geocode(entry) {
  const nameQuery = `${entry.name}, ${entry.location}, Hyderabad`;

  const poiResult = await geocodeOnce(nameQuery, { preferPoi: true });
  await sleep(1600);
  if (poiResult) return { ...poiResult, matchedQuery: nameQuery, precision: "poi" };

  const attempts = [entry.address, nameQuery, `${entry.location}, Hyderabad`];
  let lastQuery = null;
  for (const query of attempts) {
    if (!query || query === lastQuery) continue;
    lastQuery = query;
    const result = await geocodeOnce(query);
    if (result) return { ...result, matchedQuery: query, precision: query === entry.address ? "address" : "area" };
    await sleep(1600);
  }
  return null;
}

async function main() {
  const raw = JSON.parse(readFileSync(path.join(projectRoot, "new_data.json"), "utf8"));
  const active = raw.filter((entry) => entry.status === "Active");
  console.log(`${raw.length} total, ${active.length} active, ${raw.length - active.length} closed (skipped)`);

  const seeds = [];
  let fromUrl = 0;
  let failed = 0;
  const precisionCounts = { poi: 0, address: 0, area: 0 };

  for (let i = 0; i < active.length; i++) {
    const entry = active[i];
    const match = (entry.url ?? "").match(COORD_RE);
    let coords = null;

    if (match) {
      coords = { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      fromUrl++;
    } else {
      try {
        const result = await geocode(entry);
        if (result) {
          coords = result;
          precisionCounts[result.precision] = (precisionCounts[result.precision] ?? 0) + 1;
          if (result.precision === "area") {
            console.warn(`  "${entry.name}" only matched at neighborhood level (${result.matchedQuery}) — pin may be imprecise`);
          }
        }
      } catch (err) {
        console.warn(`  geocode failed for "${entry.name}": ${err.message}`);
      }
      await sleep(1600);
    }

    if (!coords) {
      failed++;
      console.warn(`  no coordinates for "${entry.name}" (${entry.address})`);
      continue;
    }

    seeds.push({
      name: entry.name,
      category: entry.category,
      location: entry.location ?? null,
      cost_for_two: entry.cost ?? null,
      note: null,
      lng: coords.lng,
      lat: coords.lat,
      image_url: null,
      tags: curatedTags(entry.tags),
      hours_text: null,
      maps_url: entry.url ?? null,
      rating: typeof entry.rating === "number" ? entry.rating : null,
    });

    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${active.length} processed…`);
  }

  writeFileSync(path.join(scriptsDir, "seed-cafes.json"), JSON.stringify(seeds, null, 2));
  const geocoded = precisionCounts.poi + precisionCounts.address + precisionCounts.area;
  console.log(
    `Done. ${seeds.length} cafes written to scripts/seed-cafes.json ` +
      `(${fromUrl} from URL, ${geocoded} geocoded, ${failed} failed).\n` +
      `Geocoding precision — poi (exact business match): ${precisionCounts.poi}, ` +
      `address (full address matched): ${precisionCounts.address}, ` +
      `area (neighborhood-level only, imprecise): ${precisionCounts.area}.`
  );
}

main();
