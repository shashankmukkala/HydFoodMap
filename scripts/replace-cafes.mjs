// Replaces the entire live `cafes` table with scripts/seed-cafes.json.
// Deletes every existing cafe (cascades to reviews/bookmarks/collection_cafes
// for those cafe ids — safe here since this project's reviews table was
// confirmed empty before this migration), then posts the new seed set.
//
// Usage: node scripts/replace-cafes.mjs [baseUrl]
// Default baseUrl: http://localhost:3000
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] ?? "http://localhost:3000";

async function main() {
  const existingRes = await fetch(`${baseUrl}/api/cafes`);
  const existing = await existingRes.json();
  console.log(`Deleting ${existing.length} existing cafes…`);

  let deleted = 0;
  let deleteFailed = 0;
  for (const cafe of existing) {
    try {
      const res = await fetch(`${baseUrl}/api/cafes/${cafe.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      deleted++;
    } catch (err) {
      deleteFailed++;
      console.warn(`  delete failed for "${cafe.name}" (${cafe.id}): ${err.message}`);
    }
  }
  console.log(`Deleted ${deleted}, ${deleteFailed} failed.`);

  const seeds = JSON.parse(readFileSync(path.join(scriptsDir, "seed-cafes.json"), "utf8"));
  console.log(`Posting ${seeds.length} new cafes…`);

  let created = 0;
  let createFailed = 0;
  for (const cafe of seeds) {
    try {
      const res = await fetch(`${baseUrl}/api/cafes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cafe),
      });
      if (!res.ok) throw new Error(await res.text());
      created++;
    } catch (err) {
      createFailed++;
      console.warn(`  create failed for "${cafe.name}": ${err.message}`);
    }
  }

  console.log(`Done. ${created} created, ${createFailed} failed.`);
}

main();
