/**
 * Builds the site's brand assets from public/logo-vasseur.png:
 *
 *   app/favicon.ico   — multi-size (16/32/48) favicon with the whole logo
 *                       contained in a transparent square (nothing clipped).
 *   app/apple-icon.png — 180×180 same square for iOS / macOS touch icons.
 *   public/og-image.png — 1200×630 Open Graph / social card: the full logo
 *                       lockup centered on the brand cream background.
 *
 * Run with:  node tools/build-brand.mjs
 * (needs the devDependencies `sharp` and `png-to-ico`.)
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGO = path.join(root, "public", "logo-vasseur.png");

const CREAM = { r: 247, g: 244, b: 238, alpha: 1 }; // #F7F4EE (site background)

/**
 * Whole logo contained in a transparent square (content ≈ 88 % of the side),
 * so the mark is never cropped and reads well at tab sizes.
 */
async function logoSquare() {
  const meta = await sharp(LOGO).metadata();
  const { width: W, height: H } = meta;
  const S = 512; // supersampled master, downscaled per target
  const content = Math.round(S * 0.88);
  const scale = Math.min(content / W, content / H);
  const w = Math.round(W * scale);
  const h = Math.round(H * scale);
  const padX = Math.round((S - w) / 2);
  const padY = Math.round((S - h) / 2);
  return sharp(LOGO)
    .resize(w, h, { fit: "fill" })
    .extend({
      top: padY,
      bottom: S - h - padY,
      left: padX,
      right: S - w - padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png();
}

async function main() {
  // Materialize the square master once, then derive every size from the PNG
  // buffer (avoiding chained sharp pipelines that misbehave with extend).
  const sq = await logoSquare();
  const master = await sq.toBuffer();

  // 1) favicon.ico (16/32/48) — replaces the default Next.js icon.
  const sizes = [];
  for (const s of [16, 32, 48]) {
    sizes.push(await sharp(master).resize(s, s).png().toBuffer());
  }
  const ico = await pngToIco(sizes);
  writeFileSync(path.join(root, "app", "favicon.ico"), ico);
  console.log("wrote app/favicon.ico", ico.length, "bytes");

  // 2) Apple touch icon 180×180.
  const apple = await sharp(master).resize(180, 180).png().toBuffer();
  writeFileSync(path.join(root, "app", "apple-icon.png"), apple);
  console.log("wrote app/apple-icon.png", apple.length, "bytes");

  // 3) Open Graph / social card 1200×630 — full lockup on cream.
  const { width: LW, height: LH } = await sharp(LOGO).metadata();
  const fit = await sharp(LOGO)
    .resize({ width: 880, height: 630 - 2 * 60, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const { width: FW, height: FH } = await sharp(fit).metadata();
  const canvas = sharp({
    create: { width: 1200, height: 630, channels: 4, background: CREAM },
  });
  const og = await canvas
    .composite([
      {
        input: fit,
        left: Math.round((1200 - FW) / 2),
        top: Math.round((630 - FH) / 2),
      },
    ])
    .png()
    .toBuffer();
  writeFileSync(path.join(root, "public", "og-image.png"), og);
  console.log("wrote public/og-image.png", og.length, "bytes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
