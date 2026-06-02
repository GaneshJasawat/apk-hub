import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, "..", "dist", "server", "index.mjs");
const clientDir = resolve(__dirname, "..", "dist", "client");

// Find assets
mkdirSync(clientDir, { recursive: true });
const files = [];
try {
  files.push(...readdirSync(resolve(clientDir, "assets")));
} catch {}

const cssFiles = files.filter((f) => f.endsWith(".css"));

// Try to load Nitro server and render the home page
try {
  const serverModule = await import(serverPath);
  const handler = serverModule.default?.fetch;
  if (handler) {
    const response = await handler(new Request("http://localhost/"), {}, {});
    if (response.ok) {
      let html = await response.text();

      // Convert absolute paths to relative for Capacitor
      html = html
        .replace(/(src|href)="\/assets\//g, '$1="assets/')
        .replace(/(src|href)="\/_assets\//g, '$1="_assets/')
        // Remove streaming-related scripts that won't work statically
        .replace(/<script class="\$tsr"[\s\S]*?<\/script>/g, "")
        .replace(/document\.currentScript\.remove\(\)/g, "");

      writeFileSync(resolve(clientDir, "index.html"), html);
      console.log("Generated SSR-rendered index.html from Nitro server");
      process.exit(0);
    }
  }
} catch (err) {
  console.warn("Nitro server SSR failed:", err.message);
}

// Fallback: generate minimal HTML from static assets
console.log("Falling back to static asset-based index.html");
