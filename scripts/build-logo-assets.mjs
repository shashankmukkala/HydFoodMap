// Cuts the Charminar mark out of its white square, twice.
//
//   node scripts/build-logo-assets.mjs [public/hyd-cafe.png]
//
// The source is black linework on an opaque white tile, which is fine on
// white and a sticker everywhere else — on the ivory interface it reads
// as a pasted box, and on the painted cover it is a white rectangle in
// the sky. Luminance becomes alpha, so the drawing keeps its own
// anti-aliasing and the paper goes away.
//
//   public/logo-mark.png        warm ink, for ivory surfaces
//   public/logo-mark-light.png  cream, for the painting
//
// Trimmed to the drawing first: the source has ~25% empty margin on every
// side, which at 32px leaves a 16px Charminar.
import sharp from "sharp";

const SOURCE = process.argv[2] ?? "public/hyd-cafe.png";
const SIZE = 256;

const trimmed = await sharp(SOURCE).flatten({ background: "#ffffff" }).trim({ threshold: 20 }).toBuffer();
const { data, info } = await sharp(trimmed)
  .resize(SIZE, SIZE, { fit: "contain", background: "#ffffff" })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

async function cut(path, [r, g, b]) {
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255 - data[i];
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path);
  console.log(`  ${path}`);
}

await cut("public/logo-mark.png", [0x24, 0x21, 0x1e]);
await cut("public/logo-mark-light.png", [0xf6, 0xec, 0xe0]);
