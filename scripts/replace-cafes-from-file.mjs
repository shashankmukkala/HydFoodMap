import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2];
const baseUrl = process.argv[3] ?? "http://localhost:3001";
const backupPath = "local-data/cafes-backup-before-curated-86.json";

if (!inputPath) {
  console.error("Usage: node scripts/replace-cafes-from-file.mjs <seed.json> [baseUrl]");
  process.exit(1);
}

async function main() {
  const existingResponse = await fetch(`${baseUrl}/api/cafes`);
  if (!existingResponse.ok) throw new Error(`Could not read existing cafes: ${existingResponse.status}`);
  const existing = await existingResponse.json();
  const seeds = JSON.parse(readFileSync(inputPath, "utf8"));
  if (!Array.isArray(existing) || !Array.isArray(seeds)) throw new Error("Invalid cafe data");

  writeFileSync(backupPath, JSON.stringify(existing, null, 2));
  console.log(`Backed up ${existing.length} existing cafes to ${backupPath}`);
  console.log(`Replacing ${existing.length} existing cafes with ${seeds.length} curated cafes…`);

  let deleted = 0;
  for (const cafe of existing) {
    const response = await fetch(`${baseUrl}/api/cafes/${cafe.id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Delete failed for ${cafe.name}: ${await response.text()}`);
    deleted += 1;
  }

  let created = 0;
  for (const cafe of seeds) {
    const response = await fetch(`${baseUrl}/api/cafes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cafe),
    });
    if (!response.ok) throw new Error(`Create failed for ${cafe.name}: ${await response.text()}`);
    created += 1;
  }

  const finalResponse = await fetch(`${baseUrl}/api/cafes`);
  const final = await finalResponse.json();
  const missingAddress = final.filter((cafe) => !cafe.address).length;
  const missingContact = final.filter((cafe) => !cafe.website_or_instagram).length;
  console.log(`Deleted ${deleted}; created ${created}; final count ${final.length}.`);
  console.log(`Missing address: ${missingAddress}; missing website/social link: ${missingContact}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
