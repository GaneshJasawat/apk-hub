import { createServer } from "http";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..", "dist", "client");

// Try to load the Nitro server entry
const serverPath = resolve(__dirname, "..", "dist", "server", "index.mjs");

let serverModule;
try {
  serverModule = await import(serverPath);
} catch {
  console.log("Nitro server module not available, using fallback HTML generation");
  generateFallbackHtml();
  process.exit(0);
}

const handler = serverModule.default?.fetch || serverModule.fetch || serverModule.default;
if (!handler) {
  console.log("No fetch handler found, using fallback HTML generation");
  generateFallbackHtml();
  process.exit(0);
}

const html = await handler(
  new Request("http://localhost/"),
  {},
  {}
);

const htmlText = await html.text();

// Find CSS and JS assets to inject proper paths
const assetDir = resolve(clientDir, "assets");
const files = [];
try {
  files.push(...readdirSync(assetDir));
} catch {}

const cssFiles = files.filter((f) => f.endsWith(".css"));
const jsFiles = files.filter((f) => f.startsWith("index-") && f.endsWith(".js"));

// The SSR HTML might have absolute paths like /assets/...
// We need relative paths for Capacitor
let finalHtml = htmlText
  .replace(/src="\/assets\//g, 'src="assets/')
  .replace(/href="\/assets\//g, 'href="assets/')
  .replace(/href="\/_assets\//g, 'href="_assets/')
  // Remove script tags that won't work (stream barrier etc)
  .replace(/<script class="\$tsr"[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<script>\(function\(a,f\)\{[\s\S]*?document\.currentScript\.remove\(\)<\/script>/g, "")
  .replace(/document\.currentScript\.remove\(\)/g, "");

// Ensure DOCTYPE
if (!finalHtml.startsWith("<!DOCTYPE")) {
  finalHtml = "<!DOCTYPE html>\n" + finalHtml;
}

mkDirSync(clientDir, { recursive: true });
writeFileSync(resolve(clientDir, "index.html"), finalHtml);
console.log("Generated SSR-rendered index.html from Nitro server response");

function generateFallbackHtml() {
  const assetDir = resolve(clientDir, "assets");
  let cssFile = "";
  let mainJsFile = "";
  try {
    const files = readdirSync(assetDir);
    for (const f of files) {
      if (f.endsWith(".css") && !cssFile) cssFile = f;
      if (f.startsWith("index-") && f.endsWith(".js") && !f.includes("nzJl") && !mainJsFile) mainJsFile = f;
    }
  } catch {}

  const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>\n  <link rel="stylesheet" href="assets/${cssFile}" data-precedence="default"/>\n  <title>ApkHub</title>\n  <script>window.$_TSR={h(){this.hydrated=!0,this.c()},e(){this.streamEnded=!0,this.c()},c(){this.hydrated&&this.streamEnded&&(delete window.$_TSR,delete window.$R?.tsr)},p(e){this.initialized?e():this.buffer.push(e)},buffer:[]};window.$R=window.$R||{};$_TSR.e();</script>\n</head>\n<body>\n  <script type="module" async src="assets/${mainJsFile}"></script>\n</body>\n</html>`;

  mkDirSync(clientDir, { recursive: true });
  writeFileSync(resolve(clientDir, "index.html"), html);
  console.log("Generated fallback index.html from static assets");
}
