// One-off: adds maps_url (Google's own link, from new_data.json's `url`
// field) to cafes that were already seeded before that column existed —
// no re-geocoding needed, coordinates are untouched. Matches on
// (name, location) rather than name alone, since some cafes share a name
// across different branches (e.g. two "Churrolto" locations).
//
// Usage: node scripts/backfill-maps-url.mjs [baseUrl]
// Default baseUrl: http://localhost:3000
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const baseUrl = process.argv[2] ?? "http://localhost:3000";

function key(name, location) {
  return `${(name ?? "").trim().toLowerCase()}|${(location ?? "").trim().toLowerCase()}`;
}

async function main() {
  const newData = JSON.parse(readFileSync(path.join(projectRoot, "new_data.json"), "utf8"));
  const byKey = new Map(newData.map((e) => [key(e.name, e.location), e.url ?? null]));

  // Also update the seed file on disk for consistency with what's live.
  const seedPath = path.join(scriptsDir, "seed-cafes.json");
  const seeds = JSON.parse(readFileSync(seedPath, "utf8"));
  const updatedSeeds = seeds.map((s) => ({ ...s, maps_url: byKey.get(key(s.name, s.location)) ?? null }));
  writeFileSync(seedPath, JSON.stringify(updatedSeeds, null, 2));
  console.log(`Updated scripts/seed-cafes.json with maps_url for ${updatedSeeds.length} entries.`);

  const res = await fetch(`${baseUrl}/api/cafes`);
  const cafes = await res.json();
  console.log(`Backfilling maps_url for ${cafes.length} live cafes…`);

  let updated = 0;
  let unmatched = 0;
  let failed = 0;
  for (const cafe of cafes) {
    const mapsUrl = byKey.get(key(cafe.name, cafe.location));
    if (mapsUrl === undefined) {
      unmatched++;
      console.warn(`  no match for "${cafe.name}" (${cafe.location})`);
      continue;
    }
    try {
      const patchRes = await fetch(`${baseUrl}/api/cafes/${cafe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maps_url: mapsUrl }),
      });
      if (!patchRes.ok) throw new Error(await patchRes.text());
      updated++;
    } catch (err) {
      failed++;
      console.warn(`  patch failed for "${cafe.name}": ${err.message}`);
    }
  }

  console.log(`Done. ${updated} updated, ${unmatched} unmatched, ${failed} failed.`);
}

main();
