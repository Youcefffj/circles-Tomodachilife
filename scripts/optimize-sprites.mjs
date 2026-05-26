#!/usr/bin/env node
/**
 * Resize every PNG under public/sprites/ to 256x256 using nearest-neighbor
 * scaling (preserves crisp pixel edges) and run a PNG palette quantization
 * pass to shrink file size dramatically.
 *
 * Run once after dropping new high-res sprites:   node scripts/optimize-sprites.mjs
 *
 * Typical result: 100-200 KB → 15-40 KB per sprite. Crucial for Vercel
 * cold-start and mobile data plans.
 */

import { readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const TARGET = 256;
const HERE = dirname(fileURLToPath(import.meta.url));
const SPRITES_DIR = join(HERE, "..", "public", "sprites");

const fmtKB = (n) => `${(n / 1024).toFixed(1)} KB`;

async function main() {
  const files = (await readdir(SPRITES_DIR)).filter((f) => f.endsWith(".png"));
  let before = 0;
  let after = 0;

  for (const file of files) {
    const path = join(SPRITES_DIR, file);
    const sizeBefore = (await stat(path)).size;
    before += sizeBefore;

    const buf = await sharp(path)
      .resize(TARGET, TARGET, {
        kernel: "nearest",     // crisp pixel edges, no blur
        fit: "inside",         // never upscale past target
        withoutEnlargement: true,
      })
      .png({
        palette: true,         // quantize to indexed PNG
        quality: 90,
        compressionLevel: 9,
        effort: 10,
      })
      .toBuffer();

    await sharp(buf).toFile(path);

    const sizeAfter = (await stat(path)).size;
    after += sizeAfter;
    const ratio = ((1 - sizeAfter / sizeBefore) * 100).toFixed(0);
    console.log(`  ${file.padEnd(28)}  ${fmtKB(sizeBefore).padStart(9)} → ${fmtKB(sizeAfter).padStart(9)}  (-${ratio}%)`);
  }

  console.log("\n" + "─".repeat(60));
  console.log(`  TOTAL  ${fmtKB(before)} → ${fmtKB(after)}  ` +
    `(${((1 - after / before) * 100).toFixed(0)}% smaller, saved ${fmtKB(before - after)})`);
}

main().catch((err) => {
  console.error("optimize-sprites failed:", err);
  process.exitCode = 1;
});
