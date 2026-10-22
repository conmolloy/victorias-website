// usage: node stale.js <oldSiteDir> <newSiteDir> <outDir>
// Returning-visitor test. Serves <oldSiteDir> with the live server's caching
// (CSS/JS/fonts: Cache-Control max-age=2592000, i.e. 30 days), visits every
// page so the browser caches its assets, then switches the same address to
// <newSiteDir> and visits again in the same browser profile. Saves full-page
// screenshots of the second visit (compare them with diff.js against fresh
// shoot.js screenshots of the new site) and lists which CSS/JS came from the
// browser cache. (Audio players are hidden too: this server has no range
// requests, so their duration/buffering display differs from a real server.)
const puppeteer = require("puppeteer-core");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const [oldDir, newDir, out] = process.argv.slice(2).map(p => path.resolve(p));
const PAGES = ["index", "gallery", "headshot", "resume", "reviews", "showreel"];
const WIDTHS = { desktop: 1366, phone: 390 };
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ico": "image/x-icon",
  ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".pdf": "application/pdf" };
let root = oldDir;

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end();
  }
  const ext = path.extname(file).toLowerCase();
  const headers = { "Content-Type": TYPES[ext] || "application/octet-stream" };
  if ([".css", ".js", ".woff2"].includes(ext)) headers["Cache-Control"] = "max-age=2592000";
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});

const settle = (page) => page.evaluate(async () => {
  document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = "eager");
  for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
  scrollTo(0, 0);
  await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 15000); })));
  await Promise.all([...document.images].map(i => i.decode().catch(() => 0)));
  await document.fonts.ready;
});

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "stale-"));
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true, userDataDir: profile, args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
  });
  // first visits: old site
  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.goto(`${base}/${p}.html`, { waitUntil: "load", timeout: 120000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.close();
  }
  // deploy: same address now serves the new site
  root = newDir;
  for (const p of PAGES) {
    for (const [label, width] of Object.entries(WIDTHS)) {
      const page = await browser.newPage();
      const cached = [], fetched = [];
      page.on("response", r => {
        const u = r.url().replace(base + "/", "");
        if (/\.(css|js)(\?|$)/.test(u) && u.startsWith("assets/")) (r.fromCache() ? cached : fetched).push(u.split("/").pop());
      });
      await page.setViewport({ width, height: 800, isMobile: label === "phone", hasTouch: label === "phone" });
      await page.goto(`${base}/${p}.html`, { waitUntil: "load", timeout: 120000 });
    await new Promise(r => setTimeout(r, 1500));
      await page.addStyleTag({ content: `video, audio, iframe, canvas { visibility: hidden !important; }
        *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }` });
      await settle(page);
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(out, `${p}-${label}.png`), fullPage: true });
      if (label === "desktop") console.log(`${p}: CSS/JS from cache ${cached.length} [${cached.join(", ")}], fetched ${fetched.length} [${fetched.join(", ")}]`);
      await page.close();
    }
  }
  await browser.close();
  server.close();
  fs.rmSync(profile, { recursive: true, force: true });
})();
