// Run after scripts/geocode-cafes.mjs has produced scripts/seed-cafes.json,
// and after Supabase is configured (.env.local filled in, migrations run).
// POSTs each cafe to a running dev/prod server's /api/cafes route.
//
// Usage: node scripts/post-seed.mjs [baseUrl]
// Default baseUrl: http://localhost:3000
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] ?? "http://localhost:3000";

async function main() {
  const seeds = JSON.parse(readFileSync(path.join(scriptsDir, "seed-cafes.json"), "utf8"));
  console.log(`Posting ${seeds.length} cafes to ${baseUrl}/api/cafes …`);

  let ok = 0;
  let failed = 0;

  for (const cafe of seeds) {
    try {
      const res = await fetch(`${baseUrl}/api/cafes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cafe),
      });
      if (!res.ok) throw new Error(await res.text());
      ok++;
    } catch (err) {
      failed++;
      console.warn(`  failed for "${cafe.name}": ${err.message}`);
    }
  }

  console.log(`Done. ${ok} created, ${failed} failed.`);
}

main();
