// One-off: adds the internal-only Google-sourced rating (from
// new_data.json's `rating` field) to cafes that were already seeded
// before app/api/cafes/route.ts started accepting it. Matches on
// (name, location) rather than name alone, since some cafes share a name
// across different branches (e.g. two "Churrolto" locations). This value
// is NOT shown to users — see the `rating` field's comment in
// lib/supabase.ts — internal ranking/ordering use only.
//
// Usage: node scripts/backfill-rating.mjs [baseUrl]
// Default baseUrl: http://localhost:3000
import { readFileSync } from "node:fs";
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
  const byKey = new Map(
    newData.map((e) => [key(e.name, e.location), typeof e.rating === "number" ? e.rating : null])
  );

  const res = await fetch(`${baseUrl}/api/cafes`);
  const cafes = await res.json();
  console.log(`Backfilling rating for ${cafes.length} live cafes…`);

  let updated = 0;
  let unmatched = 0;
  let failed = 0;
  for (const cafe of cafes) {
    const rating = byKey.get(key(cafe.name, cafe.location));
    if (rating === undefined) {
      unmatched++;
      console.warn(`  no match for "${cafe.name}" (${cafe.location})`);
      continue;
    }
    try {
      const patchRes = await fetch(`${baseUrl}/api/cafes/${cafe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
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
