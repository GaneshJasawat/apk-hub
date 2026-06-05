import { readdirSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, "..", "dist", "server", "index.mjs");
const clientDir = resolve(__dirname, "..", "dist", "client");

mkdirSync(clientDir, { recursive: true });

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
      writeFileSync(resolve(clientDir, "index.html"), html);
      console.log("Generated SSR-rendered index.html from Nitro server");
      process.exit(0);
    }
  }
} catch (err) {
  console.warn("Nitro server SSR failed:", err.message);
}

const files = [];
try {
  files.push(...readdirSync(resolve(clientDir, "assets")));
} catch {}

const cssFile = files.find((f) => f.endsWith(".css")) || "";
const mainJsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js") && !f.includes("nzJl")) || "";

const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>\n  <link rel="stylesheet" href="assets/${cssFile}" data-precedence="default"/>\n  <title>ApkHub</title>\n  <script>window.$_TSR={h(){this.hydrated=!0,this.c()},e(){this.streamEnded=!0,this.c()},c(){this.hydrated&&this.streamEnded&&(delete window.$_TSR,delete window.$R?.tsr)},p(e){this.initialized?e():this.buffer.push(e)},buffer:[]};window.$R=window.$R||{};$_TSR.e();</script>\n</head>\n<body>\n  <script type="module" async src="assets/${mainJsFile}"></script>\n</body>\n</html>`;

writeFileSync(resolve(clientDir, "index.html"), html);
console.log("Generated fallback index.html from static assets");
