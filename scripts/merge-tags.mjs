// One-off: pulls the richer `tags` list (plus price_category/serves_alcohol/
// operating_features, which are already folded into that tags array in
// new_data.json) onto the already-geocoded cafes in local-data/cafes.json
// and scripts/seed-cafes.json, matched by name. Run with:
//   node scripts/merge-tags.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const newDataPath = path.join(root, "new_data.json");
const targets = [
  path.join(root, "local-data", "cafes.json"),
  path.join(root, "scripts", "seed-cafes.json"),
];

const newData = JSON.parse(readFileSync(newDataPath, "utf8"));

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const byName = new Map();
for (const entry of newData) {
  if (entry.status !== "Active") continue; // skip permanently closed spots
  byName.set(normalizeName(entry.name), entry);
}

for (const targetPath of targets) {
  if (!existsSync(targetPath)) {
    console.log(`skip (missing): ${targetPath}`);
    continue;
  }

  const backupPath = `${targetPath}.bak`;
  copyFileSync(targetPath, backupPath);

  const cafes = JSON.parse(readFileSync(targetPath, "utf8"));
  let matched = 0;
  let unmatched = 0;

  const updated = cafes.map((cafe) => {
    const match = byName.get(normalizeName(cafe.name));
    if (!match) {
      unmatched++;
      return cafe;
    }
    matched++;
    const tags = Array.from(new Set(match.tags ?? []));
    return { ...cafe, tags };
  });

  writeFileSync(targetPath, JSON.stringify(updated, null, 2));
  console.log(`${targetPath}: matched ${matched}, unmatched ${unmatched} (backup at ${backupPath})`);
}
