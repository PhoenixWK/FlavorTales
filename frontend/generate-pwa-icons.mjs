/**
 * PWA Icon Generator
 * Requires: sharp (already in node_modules via Next.js)
 *
 * Usage: node generate-pwa-icons.mjs
 * Place your source logo at: public/logo-source.png
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE = path.join(__dirname, "public", "logo-source.png");
const OUTPUT_DIR = path.join(__dirname, "public", "icons");

if (!fs.existsSync(SOURCE)) {
  console.error("❌ Source image not found at: public/logo-source.png");
  console.error("   Please save your logo image to that path and re-run.");
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const ICONS = [
  { name: "icon-192x192.png", size: 192, maskable: false },
  { name: "icon-512x512.png", size: 512, maskable: false },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
];

// For maskable icons, source already has full-bleed background — resize directly
// Using fit:'cover' so the background extends to all edges (satisfies maskable safe zone)
async function generateMaskable(size, outputPath) {
  await sharp(SOURCE)
    .resize(size, size, {
      fit: "cover",
      kernel: "lanczos3",
      position: "centre",
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

async function generateIcon(size, outputPath) {
  await sharp(SOURCE)
    .resize(size, size, {
      fit: "cover",
      kernel: "lanczos3",
      position: "centre",
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

(async () => {
  console.log("Generating PWA icons from:", SOURCE);

  for (const icon of ICONS) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    await generateIcon(icon.size, outputPath);
    console.log(`✅ ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Maskable icon
  const maskablePath = path.join(OUTPUT_DIR, "icon-512x512-maskable.png");
  await generateMaskable(512, maskablePath);
  console.log(`✅ icon-512x512-maskable.png (512x512, with safe zone)`);

  console.log("\nDone! All icons saved to public/icons/");
})();
