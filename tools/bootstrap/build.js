// Builds the site's Bootstrap CSS from Bootstrap 5's Sass source (the same
// version as the `bootstrap` package the navbar's JavaScript uses) plus the
// Grayscale theme rules in grayscale.scss:
//
//   tools/bootstrap/grayscale.scss
//     -> public/assets/bootstrap/css/bootstrap.full.min.css
//
// Then run tools/trim-css, which writes the bootstrap.min.css pages load:
//   npm install (repo root and here) && npm run build
//   cd ../.. && npm run build && cd tools/trim-css && npm run trim
//   cd ../.. && npm run build
const fs = require("fs");
const path = require("path");
const sass = require("sass");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(
  ROOT,
  "public/assets/bootstrap/css/bootstrap.full.min.css",
);

const { css } = sass.compile(path.join(__dirname, "grayscale.scss"), {
  style: "compressed",
  loadPaths: [path.join(ROOT, "node_modules")],
  // Bootstrap 5.3's Sass still uses @import and the old colour functions
  quietDeps: true,
  silenceDeprecations: ["import", "global-builtin", "color-functions"],
});
// ASCII only: write "—" etc. as CSS escapes (as Bootstrap's own dist files
// do), so the file reads the same whatever charset the server announces
const BOM = String.fromCharCode(0xfeff);
const ascii = (css.startsWith(BOM) ? css.slice(1) : css).replace(
  /[\u0080-\u{10FFFF}]/gu,
  (c) => `\\${c.codePointAt(0).toString(16)} `,
);
fs.writeFileSync(OUT, ascii + "\n");
console.log(
  `${path.relative(ROOT, OUT)}: ${(ascii.length / 1024).toFixed(0)} KB`,
);
