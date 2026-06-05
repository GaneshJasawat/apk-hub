import { readdirSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, "..", "dist", "server", "index.mjs");
const clientDir = resolve(__dirname, "..", "dist", "client");

mkdirSync(clientDir, { recursive: true });

/**
 * Find the main entry JS file that contains `hydrateRoot(document,`.
 */
function findMainEntryJs() {
  const files = [];
  try {
    files.push(...readdirSync(resolve(clientDir, "assets")));
  } catch {}
  const candidates = files.filter(
    (f) => f.startsWith("index-") && f.endsWith(".js") && !f.includes("nzJl"),
  );
  // Return the one containing hydrateRoot, or the largest as fallback
  for (const f of candidates) {
    const content = readFileSync(resolve(clientDir, "assets", f), "utf-8");
    if (/\.hydrateRoot\(document,/.test(content)) return f;
  }
  if (candidates.length > 0) return candidates[0];
  return null;
}

/**
 * Patch the main entry JS to replace hydrateRoot with createRoot targeting #root.
 */
function patchMainJs() {
  const mainJsFile = findMainEntryJs();
  if (!mainJsFile) return;

  const jsPath = resolve(clientDir, "assets", mainJsFile);
  let content = readFileSync(jsPath, "utf-8");
  content = content.replace(
    /\.hydrateRoot\(document,/g,
    ".createRoot(document.getElementById('root') ?? document,",
  );
  writeFileSync(jsPath, content, "utf-8");
  console.log(`Patched ${mainJsFile}: hydrateRoot -> createRoot with #root fallback`);
}

/**
 * Wrap body content in <div id="root"> so createRoot has a mount point.
 */
function wrapBodyInRoot(html) {
  return html.replace(
    /<body([^>]*)>/,
    '<body$1>\n  <div id="root">',
  ).replace(
    /<\/body>/,
    '  </div>\n</body>',
  );
}

let generatedViaSsr = false;

try {
  const serverModule = await import(serverPath);
  const handler = serverModule.default?.fetch;
  if (handler) {
    const response = await handler(new Request("http://localhost/"), {}, {});
    if (response.ok) {
      let html = await response.text();
      html = html
        .replace(/(src|href)="\/assets\//g, '$1="assets/')
        .replace(/(src|href)="\/_assets\//g, '$1="_assets/')
        .replace(/document\.currentScript\.remove\(\)/g, "");
      html = wrapBodyInRoot(html);
      writeFileSync(resolve(clientDir, "index.html"), html);
      console.log("Generated SSR-rendered index.html from Nitro server");
      generatedViaSsr = true;
    }
  }
} catch (err) {
  console.warn("Nitro server SSR failed:", err.message);
}

if (!generatedViaSsr) {
  const files = [];
  try {
    files.push(...readdirSync(resolve(clientDir, "assets")));
  } catch {}

  const cssFile = files.find((f) => f.endsWith(".css")) || "";
  const mainJsFile = findMainEntryJs() || "";

  const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>\n  <link rel="stylesheet" href="assets/${cssFile}" data-precedence="default"/>\n  <title>ApkHub</title>\n  <script>window.$_TSR={h(){this.hydrated=!0,this.c()},e(){this.streamEnded=!0,this.c()},c(){this.hydrated&&this.streamEnded&&(delete window.$_TSR,delete window.$R?.tsr)},p(e){this.initialized?e():this.buffer.push(e)},buffer:[]};window.$R=window.$R||{};$_TSR.e();</script>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" async src="assets/${mainJsFile}"></script>\n</body>\n</html>`;

  writeFileSync(resolve(clientDir, "index.html"), html);
  console.log("Generated fallback index.html from static assets");
}

patchMainJs();
