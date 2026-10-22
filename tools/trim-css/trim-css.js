// Removes CSS rules that none of the site's pages use.
//
// Serves the built site (dist/, run `npm run build` in the repo root first)
// locally, opens every page in Chrome at phone/tablet/desktop
// widths and in each interactive state (as loaded, scrolled so the navbar
// shrinks, mobile menu open), and keeps every rule with a selector that
// matches an element in any of them. Pseudo-classes/elements (:hover,
// ::before, ...) are ignored when matching, and so are the classes Bootstrap
// and grayscale.js add at runtime (DYNAMIC below), so e.g.
// `.navbar-collapse.collapsing` is kept because `.navbar-collapse` exists.
//
//   public/assets/bootstrap/css/bootstrap.full.min.css   (full theme, edit/replace this)
//     -> public/assets/bootstrap/css/bootstrap.min.css     (trimmed, what pages load)
//   public/assets/fonts/font-awesome.full.min.css        (all Font Awesome 4.7 icons)
//     -> public/assets/fonts/font-awesome.min.css          (only icons used; then run tools/subset_icons.py)
//
// Re-run after adding pages or Bootstrap components:
//   npm run build && cd tools/trim-css && npm install && npm run trim
// and then `npm run build` again so dist/ gets the new trimmed files.
// (Needs Chrome; set CHROME_PATH if it isn't in the default location.)
const fs = require("fs");
const http = require("http");
const path = require("path");
const postcss = require("postcss");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "../..");
const SITE = path.join(ROOT, "dist"); // built pages (and a copy of public/)
const PUBLIC = path.join(ROOT, "public"); // CSS sources and outputs
const JOBS = [
  [
    "assets/bootstrap/css/bootstrap.full.min.css",
    "assets/bootstrap/css/bootstrap.min.css",
  ],
  [
    "assets/fonts/font-awesome.full.min.css",
    "assets/fonts/font-awesome.min.css",
  ],
];
// every page in the build (src/pages/*.astro -> dist/*.html)
const PAGES = fs.existsSync(SITE)
  ? fs
      .readdirSync(SITE)
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.slice(0, -5))
      .sort()
  : [];
const WIDTHS = [390, 800, 1366, 1920];
const DYNAMIC = [
  "show",
  "collapsing",
  "collapse",
  "collapsed",
  "navbar-shrink",
  "active",
];
const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function serve() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    // analyse pages with the full CSS, never with a previously trimmed output
    const job = JOBS.find(([, out]) => out === rel);
    const dir = job ? PUBLIC : SITE;
    if (job) rel = job[0];
    const file = path.join(dir, rel);
    if (
      !file.startsWith(dir) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {
      "Content-Type":
        TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

// selector -> what to test against the DOM
function matchable(sel) {
  let s = sel.replace(/::?-?[a-zA-Z-]+(\((?:[^()]|\([^()]*\))*\))?/g, ""); // pseudos incl. :not(...)
  for (const c of DYNAMIC)
    s = s.replace(new RegExp(`\\.${c}(?![\\w-])`, "g"), "");
  s = s.replace(/(^|[\s>+~])(?=[\s>+~]|$)/g, "$1*").trim(); // ".a .show" -> ".a *"
  return s || "*";
}

(async () => {
  if (!PAGES.length) {
    console.error(
      "No built pages in dist/ - run `npm run build` in the repo root first.",
    );
    process.exit(1);
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
  });

  const roots = JOBS.map(([src]) =>
    postcss.parse(fs.readFileSync(path.join(PUBLIC, src), "utf8")),
  );
  const selectors = new Set();
  roots.forEach((root) =>
    root.walkRules((r) => {
      if (!(r.parent.type === "atrule" && /keyframes/.test(r.parent.name)))
        r.selectors.forEach((s) => selectors.add(matchable(s)));
    }),
  );
  const all = [...selectors];
  const matched = new Set();
  const check = async (page) =>
    (
      await page.evaluate(
        (sels) =>
          sels.filter((s) => {
            try {
              return document.querySelector(s) !== null;
            } catch {
              return true;
            } // keep what we can't test
          }),
        all,
      )
    ).forEach((s) => matched.add(s));

  for (const name of PAGES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({
        width,
        height: 900,
        isMobile: width < 768,
        hasTouch: width < 768,
      });
      // only the DOM and scripts matter here, not media (audio/video keep loading)
      await page.goto(`${base}/${name}.html`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await new Promise((r) => setTimeout(r, 800));
      await check(page); // as loaded
      await page.evaluate(() => {
        scrollTo(0, 600);
        dispatchEvent(new Event("scroll"));
      });
      await new Promise((r) => setTimeout(r, 300));
      await check(page); // scrolled
      if (
        (await page.$(".navbar-toggler")) &&
        (await page.$eval(".navbar-toggler", (b) => b.offsetParent !== null))
      ) {
        await page.$eval(".navbar-toggler", (btn) => btn.click());
        await new Promise((r) => setTimeout(r, 700));
        await check(page); // menu open
      }
      await page.close();
    }
    process.stdout.write(`${name} `);
  }
  await browser.close();
  server.close();
  console.log();

  JOBS.forEach(([src, out], i) => {
    const root = roots[i];
    let kept = 0,
      total = 0;
    root.walkRules((r) => {
      if (r.parent.type === "atrule" && /keyframes/.test(r.parent.name)) return;
      total++;
      const keep = r.selectors.filter((s) => matched.has(matchable(s)));
      if (keep.length) {
        r.selectors = keep;
        kept++;
      } else r.remove();
    });
    const text = root.toString();
    root.walkAtRules(/keyframes/, (a) => {
      if (
        !new RegExp(`animation(-name)?\\s*:[^;}]*\\b${a.params}\\b`).test(text)
      )
        a.remove();
    });
    let changed = true;
    while (changed) {
      changed = false;
      root.walkAtRules((a) => {
        if (a.nodes && a.nodes.length === 0) {
          a.remove();
          changed = true;
        }
      });
    }
    const header = `/* Trimmed by tools/trim-css from ${path.basename(src)} - only rules the site uses. Do not edit; edit the full file and re-run. */\n`;
    const css = header + root.toString();
    fs.writeFileSync(path.join(PUBLIC, out), css);
    const before = fs.statSync(path.join(PUBLIC, src)).size;
    console.log(
      `${out}: kept ${kept}/${total} rules, ${(before / 1024).toFixed(0)} KB -> ${(css.length / 1024).toFixed(0)} KB`,
    );
  });
})();
