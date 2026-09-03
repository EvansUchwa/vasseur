/**
 * Builds the site's brand assets from public/logo-vasseur.png:
 *
 *   app/favicon.ico   — multi-size (16/32/48) favicon from the logo's emblem
 *                       crop, so the tab icon stays clean and legible.
 *   app/apple-icon.png — 180×180 emblem for iOS / macOS touch icons.
 *   public/og-image.png — 1200×630 Open Graph / social card: the full logo
 *                       lockup centered on the brand cream background.
 *
 * Run with:  node tools/build-brand.mjs
 * (needs the devDependencies `sharp` and `png-to-ico`.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGO = path.join(root, "public", "logo-vasseur.png");

const CREAM = { r: 247, g: 244, b: 238, alpha: 1 }; // #F7F4EE (site background)
const LOGO_FRACTION = 0.42; // emblem lives in the left 42 % of the canvas

async function emblemBbox() {
  const { data, info } = await sharp(LOGO)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const ch = info.channels; // RGBA
  const xMax = Math.round(W * LOGO_FRACTION);
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < xMax; x++) {
      if (data[(y * W + x) * ch + 3] > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

/** Square crop of the emblem with ~7 % transparent padding on each side. */
async function emblemSquare() {
  const b = await emblemBbox();
  const side = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  const S = Math.ceil(side / 0.86); // pad ≈ 7 % per side
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const { data, info } = await sharp(LOGO)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ch = info.channels;
  // Build an RGBA square by copying the emblem pixels onto a transparent canvas.
  const out = Buffer.alloc(S * S * 4);
  const x0 = Math.max(0, Math.round(cx - S / 2));
  const y0 = Math.max(0, Math.round(cy - S / 2));
  for (let y = 0; y < S; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= H) continue;
    for (let x = 0; x < S; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= W) continue;
      const si = (sy * W + sx) * ch;
      const di = (y * S + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return sharp(out, { raw: { width: S, height: S, channels: 4 } }).png();
}

async function main() {
  const sq = await emblemSquare();

  // 1) favicon.ico (16/32/48) — replaces the default Next.js icon.
  const sizes = [];
  for (const s of [16, 32, 48]) {
    sizes.push(await sq.clone().resize(s, s).png().toBuffer());
  }
  const ico = await pngToIco(sizes);
  writeFileSync(path.join(root, "app", "favicon.ico"), ico);
  console.log("wrote app/favicon.ico", ico.length, "bytes");

  // 2) Apple touch icon 180×180.
  const apple = await sq.clone().resize(180, 180).png().toBuffer();
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
