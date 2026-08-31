// One-off: re-derives scripts/seed-cafes.json's non-geo fields from
// data.json without re-geocoding (reuses the lat/lng already resolved by
// geocode-cafes.mjs, matched by name). Splits location/cost out of the old
// combined "note" string into their own fields, and drops the Google-sourced
// rating — cafes now get their displayed rating from real reviews only.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");

const raw = JSON.parse(readFileSync(path.join(projectRoot, "data.json"), "utf8"));
const existing = JSON.parse(readFileSync(path.join(scriptsDir, "seed-cafes.json"), "utf8"));

const byName = new Map(raw.map((entry) => [entry.name, entry]));

const remapped = existing.map((seed) => {
  const source = byName.get(seed.name);
  return {
    name: seed.name,
    category: seed.category,
    location: source?.location ?? null,
    cost_for_two: source?.cost ?? null,
    note: null,
    lng: seed.lng,
    lat: seed.lat,
    image_url: null,
    tags: [],
    hours_text: null,
    rating: null,
  };
});

writeFileSync(path.join(scriptsDir, "seed-cafes.json"), JSON.stringify(remapped, null, 2));
console.log(`Remapped ${remapped.length} entries.`);
