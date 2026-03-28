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

// For maskable icons, add ~12% safe-zone padding with white background
async function generateMaskable(size, outputPath) {
  const padding = Math.round(size * 0.12);
  const innerSize = size - padding * 2;

  const resized = await sharp(SOURCE)
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(outputPath);
}

async function generateIcon(size, outputPath) {
  await sharp(SOURCE)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
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
