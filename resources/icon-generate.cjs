// Icon & splash screen generator for ApkHub hybrid app
// Run: node resources/icon-generate.js
// Requires: npm install sharp --save-dev
//
// If sharp is not available, the SVG files in resources/ can be converted
// manually using tools like https://icon.kitchen or https://www.pwabuilder.com

const fs = require("fs");
const path = require("path");

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.log(`
═══════════════════════════════════════════════════════════════
  sharp not installed — install it to auto-generate PNG assets:

    npm install sharp --save-dev
    node resources/icon-generate.js

  Or manually convert the SVGs using:
  - https://icon.kitchen  (Android adaptive icons)
  - https://www.pwabuilder.com  (package as APK)
═══════════════════════════════════════════════════════════════
`);
    return;
  }

  const sizes = {
    "android/app/src/main/res/mipmap-mdpi": 48,
    "android/app/src/main/res/mipmap-hdpi": 72,
    "android/app/src/main/res/mipmap-xhdpi": 96,
    "android/app/src/main/res/mipmap-xxhdpi": 144,
    "android/app/src/main/res/mipmap-xxxhdpi": 192,
  };

  const svgBuffer = fs.readFileSync(path.join(__dirname, "icon.svg"));

  for (const [dir, size] of Object.entries(sizes)) {
    const fullDir = path.join(__dirname, "..", dir);
    fs.mkdirSync(fullDir, { recursive: true });
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(fullDir, "ic_launcher.png"));
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(fullDir, "ic_launcher_round.png"));
    console.log(`  ✓ ${dir}/ic_launcher.png (${size}x${size})`);
  }

  // Splash screen
  const splashSvg = fs.readFileSync(path.join(__dirname, "splash.svg"));
  const splashDir = path.join(__dirname, "..", "android/app/src/main/res/drawable");
  fs.mkdirSync(splashDir, { recursive: true });
  await sharp(splashSvg)
    .resize(2732, 2732)
    .png()
    .toFile(path.join(splashDir, "splash.png"));
  console.log("  ✓ drawable/splash.png (2732x2732)");

  console.log("\n✅ All assets generated!");
}

main().catch(console.error);
