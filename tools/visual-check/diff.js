// usage: node diff.js <dirA> <dirB> <diffOut>
// Pixel-compares same-named PNGs; reports height change and % pixels changed.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");

const [a, b, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
for (const f of fs
  .readdirSync(a)
  .filter((f) => f.endsWith(".png"))
  .sort()) {
  if (!fs.existsSync(path.join(b, f))) {
    console.log(`${f}: missing in B`);
    continue;
  }
  const A = PNG.sync.read(fs.readFileSync(path.join(a, f)));
  const B = PNG.sync.read(fs.readFileSync(path.join(b, f)));
  const w = Math.min(A.width, B.width),
    h = Math.min(A.height, B.height);
  const crop = (img) => {
    const o = new PNG({ width: w, height: h });
    PNG.bitblt(img, o, 0, 0, w, h, 0, 0);
    return o;
  };
  const ca = crop(A),
    cb = crop(B),
    d = new PNG({ width: w, height: h });
  const n = pixelmatch(ca.data, cb.data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(path.join(out, f), PNG.sync.write(d));
  const pct = ((100 * n) / (w * h)).toFixed(2);
  const dh = B.height - A.height;
  // first changed row, to locate where differences start
  let first = -1;
  for (let y = 0; y < h && first < 0; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d.data[i] === 255 && d.data[i + 1] === 0 && d.data[i + 2] === 0) {
        first = y;
        break;
      }
    }
  console.log(
    `${f.padEnd(26)} ${String(n).padStart(7)} px (${pct}%) changed  height ${A.height}->${B.height} (${dh >= 0 ? "+" : ""}${dh})  first diff y=${first}`,
  );
}
