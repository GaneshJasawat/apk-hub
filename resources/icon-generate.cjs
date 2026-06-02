const fs = require("fs");
const path = require("path");

const ANDROID_RES = path.join(__dirname, "..", "android/app/src/main/res");
const RESOURCES = path.join(__dirname);

async function main() {
  // 1. Generate PNG icons from SVGs (fallback for pre-API 26)
  let sharp;
  try { sharp = require("sharp"); } catch { sharp = null; }

  if (sharp) {
    const sizes = {
      "mipmap-mdpi": 48,
      "mipmap-hdpi": 72,
      "mipmap-xhdpi": 96,
      "mipmap-xxhdpi": 144,
      "mipmap-xxxhdpi": 192,
    };
    const svgBuffer = fs.readFileSync(path.join(RESOURCES, "icon.svg"));
    for (const [dir, size] of Object.entries(sizes)) {
      const fullDir = path.join(ANDROID_RES, dir);
      fs.mkdirSync(fullDir, { recursive: true });
      await sharp(svgBuffer).resize(size, size).png().toFile(path.join(fullDir, "ic_launcher.png"));
      await sharp(svgBuffer).resize(size, size).png().toFile(path.join(fullDir, "ic_launcher_round.png"));
      console.log(`  icon ${size}x${size}`);
    }
    // Splash PNG from SVG
    const splashSvg = fs.readFileSync(path.join(RESOURCES, "splash.svg"));
    const splashDir = path.join(ANDROID_RES, "drawable");
    fs.mkdirSync(splashDir, { recursive: true });
    await sharp(splashSvg).resize(2732, 2732).png().toFile(path.join(splashDir, "splash.png"));
    console.log("  splash.png");
  } else {
    console.log("  sharp not available, skipping PNG generation");
  }

  // 2. Copy adaptive icon XML drawables (for API 26+)
  const drawableDir = path.join(ANDROID_RES, "drawable");
  fs.mkdirSync(drawableDir, { recursive: true });
  fs.copyFileSync(path.join(RESOURCES, "ic_launcher_background.xml"), path.join(drawableDir, "ic_launcher_background.xml"));
  fs.copyFileSync(path.join(RESOURCES, "ic_launcher_foreground.xml"), path.join(drawableDir, "ic_launcher_foreground.xml"));
  console.log("  adaptive icon XMLs");

  // 3. Adaptive icon definitions for mipmap-anydpi-v26
  const anydpiDir = path.join(ANDROID_RES, "mipmap-anydpi-v26");
  fs.mkdirSync(anydpiDir, { recursive: true });
  fs.writeFileSync(path.join(anydpiDir, "ic_launcher.xml"), `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`);
  fs.writeFileSync(path.join(anydpiDir, "ic_launcher_round.xml"), `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`);
  console.log("  adaptive icon definitions");

  // 4. Splash colors
  fs.copyFileSync(path.join(RESOURCES, "splash_colors.xml"), path.join(ANDROID_RES, "values", "splash_colors.xml"));
  console.log("  splash colors");

  // 5. Splash drawable
  fs.copyFileSync(path.join(RESOURCES, "splash_drawable.xml"), path.join(drawableDir, "splash_drawable.xml"));
  console.log("  splash drawable");

  // 6. Update styles.xml — replace existing splash style with our drawable
  const stylesPath = path.join(ANDROID_RES, "values", "styles.xml");
  let styles = fs.readFileSync(stylesPath, "utf-8");
  styles = styles.replace(
    /<style name="AppTheme\.NoActionBarLaunch".*?<\/style>/s,
    `<style name="AppTheme.NoActionBarLaunch" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_drawable</item>
    </style>`
  );
  fs.writeFileSync(stylesPath, styles);
  console.log("  styles.xml updated");

  // 7. Update strings.xml app name
  const stringsPath = path.join(ANDROID_RES, "values", "strings.xml");
  let strings = fs.readFileSync(stringsPath, "utf-8");
  if (strings.includes("app_name")) {
    strings = strings.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">ApkHub</string>');
    fs.writeFileSync(stringsPath, strings);
    console.log("  strings.xml updated");
  }

  console.log("\nAll assets generated!");
}

main().catch((e) => { console.error(e); process.exit(1); });
