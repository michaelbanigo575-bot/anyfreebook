/**
 * Regenerates the PWA / Play Store icon set from the SVG masters in design/.
 *
 *   npm install --no-save sharp
 *   node scripts/generate-icons.mjs
 *
 * The generated PNGs are committed to the repo, so `sharp` is a build-time-only
 * tool and never a runtime dependency of the site.
 *
 * Outputs:
 *   public/icon-192.png           web install icon (purpose: any)
 *   public/icon-512.png           web install icon (purpose: any)
 *   public/icon-maskable-512.png  Android adaptive / maskable icon
 *   public/apple-touch-icon.png   iOS home-screen icon (180x180, opaque square)
 *   public/favicon.ico            multi-resolution 16/32/48
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const design = join(root, 'design');
const pub = join(root, 'public');

const anySvg = readFileSync(join(design, 'icon.svg'));
const maskSvg = readFileSync(join(design, 'icon-maskable.svg'));

await mkdirSync(pub, { recursive: true });

// "any" purpose: rounded tile with transparent corners.
await sharp(anySvg).resize(192, 192).png().toFile(join(pub, 'icon-192.png'));
await sharp(anySvg).resize(512, 512).png().toFile(join(pub, 'icon-512.png'));

// "maskable" purpose: full-bleed square, glyph inside the 80% safe circle.
await sharp(maskSvg).resize(512, 512).png().toFile(join(pub, 'icon-maskable-512.png'));

// iOS: opaque square. iOS applies its own corner mask, so no rounding here.
await sharp(maskSvg).resize(180, 180).png().toFile(join(pub, 'apple-touch-icon.png'));

/**
 * Minimal ICO container writer (PNG-compressed entries, supported by every
 * browser since IE11 / all modern engines).
 */
function buildIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;

  images.forEach((img, i) => {
    const e = 16 * i;
    entries.writeUInt8(img.size >= 256 ? 0 : img.size, e + 0);
    entries.writeUInt8(img.size >= 256 ? 0 : img.size, e + 1);
    entries.writeUInt8(0, e + 2); // palette size
    entries.writeUInt8(0, e + 3); // reserved
    entries.writeUInt16LE(1, e + 4); // colour planes
    entries.writeUInt16LE(32, e + 6); // bits per pixel
    entries.writeUInt32LE(img.data.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += img.data.length;
  });

  return Buffer.concat([header, entries, ...images.map((i) => i.data)]);
}

const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  const data = await sharp(anySvg).resize(size, size).png().toBuffer();
  icoImages.push({ size, data });
}
writeFileSync(join(pub, 'favicon.ico'), buildIco(icoImages));

console.log('icons written:');
for (const f of [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon.ico',
]) {
  console.log('  public/' + f);
}
