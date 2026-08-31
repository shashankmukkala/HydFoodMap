// One-time batch job: turns data.json (459 real Hyderabad cafes/bars, scraped
// from Google Maps listings) into a seed file our /api/cafes route can POST.
//
// 37 entries have a lat/lng embedded in their Google Maps URL
// ("...!3d{lat}!4d{lng}...") and are used directly. The rest only have a
// text address, so they're geocoded via Nominatim — throttled to roughly
// one request/second with an identifying User-Agent, per Nominatim's usage
// policy (this is a one-time run over a fixed dataset, not a live proxy).
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeOnce(query, retriesLeft = 2) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("viewbox", "78.20,17.60,78.75,17.15");
  url.searchParams.set("bounded", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (res.status === 429) {
    if (retriesLeft <= 0) throw new Error("Nominatim 429 (rate limited, retries exhausted)");
    await sleep(8000);
    return geocodeOnce(query, retriesLeft - 1);
  }
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// Full structured addresses (plot/floor/building numbers) mostly fail
// against Nominatim's free-text geocoder — Indian OSM coverage at that
// granularity is thin. Fall back to progressively coarser queries: full
// address -> business name + neighborhood -> neighborhood alone (at least
// lands in the right area instead of not appearing on the map at all).
async function geocode(entry) {
  const attempts = [entry.address, `${entry.name}, ${entry.location}, Hyderabad`, `${entry.location}, Hyderabad`];

  let lastQuery = null;
  for (const query of attempts) {
    if (query === lastQuery) continue;
    lastQuery = query;
    const result = await geocodeOnce(query);
    if (result) return { ...result, matchedQuery: query };
    await sleep(1600);
  }
  return null;
}

async function main() {
  const raw = JSON.parse(readFileSync(path.join(projectRoot, "data.json"), "utf8"));
  const active = raw.filter((entry) => entry.status === "Active");
  console.log(`${raw.length} total, ${active.length} active, ${raw.length - active.length} closed (skipped)`);

  const seeds = [];
  let geocoded = 0;
  let fromUrl = 0;
  let failed = 0;

  for (let i = 0; i < active.length; i++) {
    const entry = active[i];
    const match = entry.url.match(COORD_RE);
    let coords = null;

    if (match) {
      coords = { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      fromUrl++;
    } else {
      try {
        const result = await geocode(entry);
        if (result) {
          coords = result;
          geocoded++;
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
      note: `Avg cost ${entry.cost} · ${entry.address}`,
      lng: coords.lng,
      lat: coords.lat,
      image_url: null,
      tags: [],
      hours_text: null,
      rating: typeof entry.rating === "number" ? entry.rating : null,
    });

    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${active.length} processed…`);
  }

  writeFileSync(path.join(scriptsDir, "seed-cafes.json"), JSON.stringify(seeds, null, 2));
  console.log(
    `Done. ${seeds.length} cafes written to scripts/seed-cafes.json ` +
      `(${fromUrl} from URL, ${geocoded} geocoded, ${failed} failed).`
  );
}

main();
