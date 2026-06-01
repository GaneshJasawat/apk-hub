// Restructure Nitro output to Vercel prebuilt format (.vercel/output/)
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const vercelOutput = path.join(root, ".vercel", "output");

// Remove existing .vercel/output
if (fs.existsSync(vercelOutput)) {
  fs.rmSync(vercelOutput, { recursive: true, force: true });
}

// 1. Create the functions directory for the server
const funcDir = path.join(vercelOutput, "functions", "__server.func");
fs.mkdirSync(funcDir, { recursive: true });

// Copy server files into the function directory
function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true, force: true });
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyRecursive(path.join(dist, "server"), funcDir);

// 2. Copy static files (client build)
const staticDir = path.join(vercelOutput, "static");
fs.mkdirSync(staticDir, { recursive: true });
copyRecursive(path.join(dist, "client"), staticDir);

// 3. Copy Vercel config.json from dist
fs.copyFileSync(
  path.join(dist, "config.json"),
  path.join(vercelOutput, "config.json"),
);

console.log("[vercel-output] ✅ .vercel/output ready");
