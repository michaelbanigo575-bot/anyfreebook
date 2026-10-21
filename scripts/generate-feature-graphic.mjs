/**
 * Renders the Google Play feature graphic (1024x500) from the SVG master.
 *
 *   npm install --no-save sharp
 *   node scripts/generate-feature-graphic.mjs
 *
 * Output: play-store/feature-graphic-1024x500.png
 *
 * Google Play requires a 1024x500 PNG or JPEG with no alpha channel. The
 * gradient artwork is fully opaque, so the alpha channel is flattened away
 * here rather than relying on the encoder default.
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'play-store');
const svg = readFileSync(join(root, 'design', 'feature-graphic.svg'));

await mkdirSync(outDir, { recursive: true });

const out = join(outDir, 'feature-graphic-1024x500.png');
await sharp(svg)
  .resize(1024, 500)
  .flatten({ background: '#6366f1' }) // strip alpha — Play rejects transparency
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log('wrote play-store/feature-graphic-1024x500.png');
