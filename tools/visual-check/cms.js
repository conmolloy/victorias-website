// usage: node cms.js <siteUrl> <repoDir> <outDir>
// Opens the editing screen (<siteUrl>/admin/ – e.g. a built dist/ served
// locally) without signing in to GitHub: its "Work with Local Repository"
// mode is pointed at a copy of the repo's content files and photos kept in
// the browser's private storage. Then it opens each page's editor, saves a
// screenshot of the editor + live preview, the preview pane on its own, and
// lists console errors. Nothing is committed anywhere.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const [site, repo, out] = process.argv.slice(2);
const ENTRIES = ["home", "gallery", "headshots", "reviews"];
// what the editor needs to read: config, content files, photos
const SEED = [
  "src/content",
  "src/assets/img",
  "public/assets/img",
  "public/admin",
];

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? files(p) : [p];
  });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error")
      problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) =>
    problems.push(`page error: ${e.message.slice(0, 200)}`),
  );
  page.on("response", (r) => {
    if (r.status() >= 400)
      problems.push(`${r.status()} ${r.url().slice(0, 150)}`);
  });

  // the folder picker returns a folder in the browser's private storage
  await page.evaluateOnNewDocument(() => {
    window.showDirectoryPicker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle("repo", {
        create: true,
      });
  });
  await page.goto(`${site}/admin/`, { waitUntil: "networkidle2" });

  // copy the repo files into that folder (plus a minimal .git/config)
  const seed = [
    [
      ".git/config",
      Buffer.from(
        '[remote "origin"]\n\turl = https://github.com/conmolloy/victorias-website.git\n',
      ),
    ],
    [".git/HEAD", Buffer.from("ref: refs/heads/main\n")],
    ...SEED.flatMap((dir) =>
      files(path.join(repo, dir)).map((f) => [
        path.relative(repo, f).replace(/\\/g, "/"),
        fs.readFileSync(f),
      ]),
    ),
  ];
  for (const [rel, buf] of seed) {
    await page.evaluate(
      async (rel, b64) => {
        let dir = await (
          await navigator.storage.getDirectory()
        ).getDirectoryHandle("repo", { create: true });
        const parts = rel.split("/");
        for (const part of parts.slice(0, -1))
          dir = await dir.getDirectoryHandle(part, { create: true });
        const file = await dir.getFileHandle(parts.at(-1), { create: true });
        const w = await file.createWritable();
        await w.write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
        await w.close();
      },
      rel,
      buf.toString("base64"),
    );
  }
  console.log(`seeded ${seed.length} files`);

  const button = await page.waitForSelector(
    "::-p-text(Work with Local Repository)",
    { timeout: 30000 },
  );
  await button.click();
  await new Promise((r) => setTimeout(r, 5000));

  for (const name of ENTRIES) {
    await page.goto(`${site}/admin/#/collections/${name}/entries/${name}`, {
      waitUntil: "networkidle2",
    });
    await new Promise((r) => setTimeout(r, 6000));
    await page.screenshot({ path: path.join(out, `${name}-editor.png`) });
    // the preview pane is an iframe: what's in it
    const info = await page.evaluate(() => {
      const iframes = [...document.querySelectorAll("iframe")];
      return iframes.map((f) => {
        const doc = f.contentDocument;
        return {
          title: f.title,
          height: doc ? doc.documentElement.scrollHeight : 0,
          text: doc
            ? doc.body.innerText.replace(/\s+/g, " ").slice(0, 160)
            : "(no access)",
          keyPaths: doc ? doc.querySelectorAll("[data-key-path]").length : 0,
          images: doc
            ? [...doc.images].map((i) => i.complete && i.naturalWidth > 0)
            : [],
        };
      });
    });
    for (const f of info) {
      const ok = f.images.filter(Boolean).length;
      console.log(
        `${name}: preview "${f.title}" ${f.height}px, ${f.keyPaths} marked fields, images ${ok}/${f.images.length} loaded – ${f.text}`,
      );
    }
    // full-height screenshot of the preview: enlarge the window to fit it
    const el = await page.$("iframe");
    if (el) {
      const h = Math.max(...info.map((f) => f.height), 1000);
      await page.setViewport({ width: 1600, height: Math.min(h + 200, 16000) });
      await new Promise((r) => setTimeout(r, 1500));
      await el.screenshot({ path: path.join(out, `${name}-preview.png`) });
      await page.setViewport({ width: 1600, height: 1000 });
    }
  }
  console.log(
    problems.length
      ? problems.join("\n")
      : "no console errors or failed requests",
  );
  await browser.close();
})();
