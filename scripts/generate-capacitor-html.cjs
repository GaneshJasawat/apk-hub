const fs = require("fs");
const path = require("path");

const clientDir = path.resolve(__dirname, "..", "dist", "client");

let cssFile = "";
let mainJsFile = "";
const files = fs.readdirSync(path.join(clientDir, "assets"));
for (const f of files) {
  if (f.endsWith(".css")) cssFile = f;
  if (f.startsWith("index-") && f.endsWith(".js") && !f.includes("nzJl")) mainJsFile = f;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charSet="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <link rel="stylesheet" href="assets/${cssFile}" data-precedence="default"/>
  <title>ApkHub</title>
  <script>self.$_TSR={h(){this.hydrated=!0,this.c()},e(){this.streamEnded=!0,this.c()},c(){this.hydrated&&this.streamEnded&&(delete self.$_TSR,delete self.$R.tsr)},p(e){this.initialized?e():this.buffer.push(e)},buffer:[],router:{}};self.$R=self.$R||{};$_TSR.e();</script>
</head>
<body>
  <div id="root"></div>
  <script type="module" async src="assets/${mainJsFile}"></script>
</body>
</html>`;

fs.writeFileSync(path.join(clientDir, "index.html"), html);
console.log("Generated index.html in dist/client/");
