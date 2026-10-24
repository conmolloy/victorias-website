// usage: node behave.js <baseUrl>
// Functional checks for every page: errors, failed requests, mobile menu,
// navbar shrink on scroll, smooth-scroll links, CV PDF rendering, icons,
// gallery video previews.
const puppeteer = require("puppeteer-core");
const base = process.argv[2];
const PAGES = ["index", "gallery", "headshot", "resume", "reviews", "showreel"];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  for (const name of PAGES) {
    const p = await browser.newPage();
    const errors = [],
      failed = [];
    p.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 120));
    });
    p.on("requestfailed", (r) =>
      failed.push(r.url().split("/").pop().slice(0, 60)),
    );
    p.on("response", (r) => {
      if (r.status() >= 400 && r.url().startsWith(base))
        failed.push(r.status() + " " + r.url().split("/").pop());
    });
    await p.setViewport({
      width: 390,
      height: 800,
      isMobile: true,
      hasTouch: true,
    });
    await p.goto(`${base}/${name}.html`, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    const r = {};
    // mobile menu
    await p.click(".navbar-toggler");
    await new Promise((res) => setTimeout(res, 700));
    r.menuOpens = await p.evaluate(() =>
      document.querySelector(".navbar-collapse").classList.contains("show"),
    );
    await p.click(".navbar-toggler");
    await new Promise((res) => setTimeout(res, 700));
    r.menuCloses = await p.evaluate(
      () =>
        !document.querySelector(".navbar-collapse").classList.contains("show"),
    );
    // navbar shrink on scroll
    await p.evaluate(() => {
      window.scrollTo(0, 400);
      window.dispatchEvent(new Event("scroll"));
    });
    await new Promise((res) => setTimeout(res, 300));
    r.navShrinks = await p.evaluate(() =>
      document.querySelector("#mainNav").classList.contains("navbar-shrink"),
    );
    // smooth scroll for in-page links (only pages that have them)
    const anchor = await p.evaluate(() => {
      const a = [
        ...document.querySelectorAll(
          'a.js-scroll-trigger[href*="#"]:not([href="#"])',
        ),
      ].find(
        (a) =>
          a.pathname === location.pathname && document.querySelector(a.hash),
      );
      return a ? a.hash : null;
    });
    if (anchor) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.setViewport({ width: 1366, height: 800 });
      await p.evaluate(
        (h) =>
          document.querySelector(`a.js-scroll-trigger[href$="${h}"]`).click(),
        anchor,
      );
      await new Promise((res) => setTimeout(res, 1500));
      r.smoothScroll = (await p.evaluate(
        (h) =>
          Math.abs(document.querySelector(h).getBoundingClientRect().top - 48) <
          5,
        anchor,
      ))
        ? `ok ${anchor}`
        : `FAIL ${anchor}`;
    }
    // Font Awesome icon renders (non-empty ::before glyph with FA font)
    r.icons = await p.evaluate(() => {
      const i = document.querySelector(".fa");
      if (!i) return "none";
      const s = getComputedStyle(i, "::before");
      return s.content !== "none" &&
        s.content !== '""' &&
        /FontAwesome/i.test(getComputedStyle(i).fontFamily)
        ? "ok"
        : "FAIL";
    });
    // gallery: click-to-load video previews swap to the real player, same size
    const facades = await p.$$("a.video-facade");
    if (facades.length) {
      await p.setViewport({ width: 1366, height: 800 });
      const before = await facades[0].evaluate((a) => {
        a.scrollIntoView({ block: "center" });
        const r = a.getBoundingClientRect();
        return [
          Math.round(r.width),
          Math.round(r.height),
          a.getAttribute("data-embed"),
        ];
      });
      await facades[0].click();
      await new Promise((res) => setTimeout(res, 500));
      const after = await p.evaluate((src) => {
        const f = document.querySelector(`iframe[src="${src}"]`);
        if (!f) return null;
        const r = f.getBoundingClientRect();
        return [Math.round(r.width), Math.round(r.height)];
      }, before[2]);
      r.videoFacade = after
        ? `${facades.length} previews; click -> iframe ${after[0]}x${after[1]} (preview was ${before[0]}x${before[1]})`
        : "FAIL no iframe";
    }
    if (name === "resume") {
      await new Promise((res) => setTimeout(res, 3000));
      r.pdf = await p.evaluate(() => {
        const c = document.querySelector("canvas");
        if (!c || !c.width) return "no canvas";
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let ink = 0;
        for (let i = 0; i < d.length; i += 40) if (d[i] < 200) ink++;
        return ink > 100 ? `rendered ${c.width}x${c.height}` : "blank";
      });
    }
    r.errors = errors;
    r.failed = failed.filter(
      (f) => !/google|doubleclick|gtm|gtag|collect/.test(f),
    );
    console.log(name.padEnd(9), JSON.stringify(r));
    await p.close();
  }
  await browser.close();
})();
