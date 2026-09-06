import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/geocode-csv.mjs <input.csv> <output.csv>");
  process.exit(1);
}

const USER_AGENT = "HydCafeMap/1.0 (one-time venue coordinate enrichment)";
const POI_CLASSES = new Set(["amenity", "shop", "tourism", "leisure", "craft"]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function search(query, preferPoi) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", preferPoi ? "5" : "1");
  url.searchParams.set("viewbox", "78.20,17.60,78.75,17.15");
  url.searchParams.set("bounded", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const result = preferPoi ? results.find((item) => POI_CLASSES.has(item.class)) : results[0];
  if (!result) return null;
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    precision: preferPoi ? "poi" : "address",
  };
}

async function geocode(venue) {
  const name = venue["Cafe Name"];
  const area = venue.Area;
  const address = venue.Address;
  const nameQuery = `${name}, ${area}, Hyderabad`;
  const poi = await search(nameQuery, true);
  await sleep(1600);
  if (poi) return poi;

  const addressResult = await search(`${address}, Hyderabad`, false);
  await sleep(1600);
  if (addressResult) return addressResult;

  const areaResult = await search(`${area}, Hyderabad`, false);
  if (areaResult) return { ...areaResult, precision: "area" };
  return null;
}

async function main() {
  const rows = parseCsv(readFileSync(inputPath, "utf8"));
  if (rows.length < 2) throw new Error("CSV has no data rows");

  const headers = rows[0];
  const records = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  const outputHeaders = [...headers, "Latitude", "Longitude", "Coordinate Source", "Coordinate Accuracy"];
  const output = [outputHeaders];
  let exact = 0;
  let address = 0;
  let area = 0;
  let failed = 0;

  for (let index = 0; index < records.length; index += 1) {
    const venue = records[index];
    let coordinates = null;
    try {
      coordinates = await geocode(venue);
    } catch (error) {
      console.warn(`Geocoding failed for ${venue["Cafe Name"]}: ${error.message}`);
    }

    if (coordinates) {
      if (coordinates.precision === "poi") exact += 1;
      else if (coordinates.precision === "address") address += 1;
      else area += 1;
    } else {
      failed += 1;
    }

    output.push([
      ...headers.map((header) => venue[header]),
      coordinates?.lat ?? "",
      coordinates?.lng ?? "",
      coordinates ? "OpenStreetMap Nominatim" : "",
      coordinates?.precision ?? "not found",
    ]);
    console.log(`${index + 1}/${records.length}: ${venue["Cafe Name"]} -> ${coordinates ? `${coordinates.lat}, ${coordinates.lng} (${coordinates.precision})` : "not found"}`);
  }

  writeFileSync(outputPath, `${output.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
  console.log(`Wrote ${records.length} venues to ${outputPath}`);
  console.log(`Accuracy: exact business ${exact}, address ${address}, area ${area}, not found ${failed}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
