// usage: node shoot.js <baseUrl> <outDir>
// Full-page screenshots of every page at desktop + phone widths, with
// nondeterministic content (video frames, third-party iframes) hidden.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const [base, out] = process.argv.slice(2);
const PAGES = (
  process.env.PAGES || "index,gallery,headshot,resume,reviews,showreel"
).split(",");
const WIDTHS = { desktop: 1366, phone: 390 };

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
  });
  for (const p of PAGES) {
    for (const [label, width] of Object.entries(WIDTHS)) {
      const page = await browser.newPage();
      await page.setViewport({
        width,
        height: 800,
        isMobile: label === "phone",
        hasTouch: label === "phone",
      });
      await page.goto(`${base}/${p}.html`, {
        waitUntil: "networkidle2",
        timeout: 120000,
      });
      await page.addStyleTag({
        content: `
        video, iframe, canvas { visibility: hidden !important; }
        *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
      });
      // scroll through so lazy images load, then wait for all of them
      await page.evaluate(async () => {
        document
          .querySelectorAll('img[loading="lazy"]')
          .forEach((i) => (i.loading = "eager"));
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo(0, 0);
        await Promise.all(
          [...document.images].map((i) =>
            i.complete
              ? 0
              : new Promise((r) => {
                  i.onload = i.onerror = r;
                  setTimeout(r, 15000);
                }),
          ),
        );
        await Promise.all(
          [...document.images].map((i) =>
            i.decode ? i.decode().catch(() => 0) : 0,
          ),
        );
        await document.fonts.ready;
      });
      await new Promise((r) => setTimeout(r, 800));
      await page.screenshot({
        path: path.join(out, `${p}-${label}.png`),
        fullPage: true,
      });
      await page.close();
      process.stdout.write(`${p}-${label} `);
    }
  }
  await browser.close();
  console.log("\ndone");
})();
