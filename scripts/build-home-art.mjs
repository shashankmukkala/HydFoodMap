// Turns the source painting into the two framings the home page needs.
//
//   node scripts/build-home-art.mjs [assets/home-source.png]
//
// One painting, two crops. At 1663x945 the source is 1.76:1 and a phone is
// about 0.46:1, so covering a phone with the wide file shows a quarter of
// the picture and asks the browser to blow that quarter up to a retina
// screen. The phone gets its own crop instead, framed on the counter, and
// the upscaling happens here with lanczos rather than in the browser.
//
//   public/home-wide.webp   the whole street, for anything landscape
//   public/home-tall.webp   the storefront, for anything portrait
//
// Upscaling is defensible for this image and would not be for a photo: it
// is flat-shaded illustration, which lanczos handles without inventing
// texture, and the SVG grain the cover lays on top stays crisp at any
// density regardless.
import sharp from "sharp";
import fs from "node:fs";

const SOURCE = process.argv[2] ?? "assets/home-source.png";
if (!fs.existsSync(SOURCE)) {
  console.error(`No source at ${SOURCE}`);
  process.exit(1);
}

const { width: W, height: H } = await sharp(SOURCE).metadata();
console.log(`\nsource ${SOURCE} — ${W}x${H}\n`);

async function write(path, image, targetW) {
  await image.resize(targetW, null, { kernel: "lanczos3" }).webp({ quality: 80, effort: 6 }).toFile(path);
  const m = await sharp(path).metadata();
  const kb = (fs.statSync(path).size / 1024).toFixed(0);
  console.log(`  ${path.padEnd(24)} ${m.width}x${m.height}  ${kb}KB`);
}

// Wide: the whole painting. Nothing in it needs cropping away — the
// chalkboard's painted capitals are the one hazard, and the cover handles
// that by keeping its links at the opposite corner.
await write("public/home-wide.webp", sharp(SOURCE), 2400);

// Tall: the couple, the barista and the lit shelves. Centred left of the
// middle so the pendant lamps and the counter both make it in, and the
// chalkboard stays out.
const CROP_W = 600;
const COUNTER_CENTRE = 760;
await write(
  "public/home-tall.webp",
  sharp(SOURCE).extract({
    left: Math.round(COUNTER_CENTRE - CROP_W / 2),
    top: 0,
    width: CROP_W,
    height: H,
  }),
  1300
);

console.log("");
