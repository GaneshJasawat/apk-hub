// Android resource generator — creates adaptive icon XMLs, splash drawable, and color resources
// No sharp or SVG dependencies needed. Everything is pure XML vector resources.
const fs = require("fs");
const path = require("path");

const RES = path.join(__dirname, "..", "android/app/src/main/res");
const DRAWABLE = path.join(RES, "drawable");
const VALUES = path.join(RES, "values");

fs.mkdirSync(DRAWABLE, { recursive: true });
fs.mkdirSync(VALUES, { recursive: true });

// ── 1. Icon background — solid purple ──
fs.writeFileSync(path.join(DRAWABLE, "ic_launcher_background.xml"), `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#7c3aed" android:pathData="M0,0h108v108H0z" />
</vector>`);

// ── 2. Icon foreground — white package icon ──
fs.writeFileSync(path.join(DRAWABLE, "ic_launcher_foreground.xml"), `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- box -->
    <path android:fillColor="#FFFFFF" android:pathData="M32,28h44v48H32z" android:strokeWidth="2" android:strokeColor="#FFFFFF" />
    <!-- tape -->
    <path android:fillColor="#FFFFFF" android:fillAlpha="0.4" android:pathData="M42,28v28h24V28z" />
    <!-- arrow down -->
    <path android:fillColor="#7c3aed" android:pathData="M50,60h8v-8h6l-10,12 -10,-12h6z" />
</vector>`);

// ── 3. Adaptive icon definitions for mipmap-anydpi-v26 ──
const ANYPATH = path.join(RES, "mipmap-anydpi-v26");
fs.mkdirSync(ANYPATH, { recursive: true });
const adaptive =
`<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>`;
fs.writeFileSync(path.join(ANYPATH, "ic_launcher.xml"), adaptive);
fs.writeFileSync(path.join(ANYPATH, "ic_launcher_round.xml"), adaptive);

// ── 4. Splash colors ──
fs.writeFileSync(path.join(VALUES, "splash_colors.xml"), `<resources>
    <color name="splash_background">#FF7c3aed</color>
</resources>`);

// ── 5. Splash drawable — purple background + centered white icon ──
fs.writeFileSync(path.join(DRAWABLE, "splash_drawable.xml"), `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background" />
    <item
        android:width="96dp"
        android:height="96dp"
        android:gravity="center"
        android:drawable="@drawable/ic_launcher_foreground" />
</layer-list>`);

// ── 6. Update styles.xml — replace splash style ──
const stylesPath = path.join(VALUES, "styles.xml");
let styles = fs.readFileSync(stylesPath, "utf-8");
styles = styles.replace(
    /<style name="AppTheme\.NoActionBarLaunch".*?<\/style>/s,
    `<style name="AppTheme.NoActionBarLaunch" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_drawable</item>
    </style>`
);
fs.writeFileSync(stylesPath, styles);

// ── 7. App name ──
const stringsPath = path.join(VALUES, "strings.xml");
let strings = fs.readFileSync(stringsPath, "utf-8");
strings = strings.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">ApkHub</string>');
fs.writeFileSync(stringsPath, strings);

console.log("Android resources generated: icons, splash, styles, strings");
