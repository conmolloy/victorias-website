// usage: node states.js <baseUrl> <outDir> — viewport screenshots of interactive states
const puppeteer = require("puppeteer-core");
const fs = require("fs"),
  path = require("path");
const [base, out] = process.argv.slice(2);
const PAGES = ["index", "gallery", "headshot", "resume", "reviews", "showreel"];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--hide-scrollbars"],
  });
  const prep = async (p, url, w, mobile) => {
    await p.setViewport({
      width: w,
      height: 800,
      isMobile: mobile,
      hasTouch: mobile,
    });
    await p.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
    await p.addStyleTag({
      content: "video,iframe,canvas{visibility:hidden!important}",
    });
    await p.evaluate(async () => {
      document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => 0)),
      );
      await document.fonts.ready;
    });
  };
  for (const n of PAGES) {
    const url = `${base}/${n}.html`;
    let p = await b.newPage();
    // phone: menu open (after the collapse animation)
    await prep(p, url, 390, true);
    await p.click(".navbar-toggler");
    await pause(900);
    await p.screenshot({ path: path.join(out, `${n}-phone-menu.png`) });
    // phone: menu link pressed/focused state
    await p.focus("#navbarResponsive .nav-link");
    await pause(300);
    await p.screenshot({ path: path.join(out, `${n}-phone-menu-focus.png`) });
    await p.close();
    // desktop: scrolled (navbar shrinks), then hovering the first nav link
    p = await b.newPage();
    await prep(p, url, 1366, false);
    await p.evaluate(() => {
      scrollTo(0, 700);
      dispatchEvent(new Event("scroll"));
    });
    await pause(700);
    await p.screenshot({ path: path.join(out, `${n}-desktop-scrolled.png`) });
    await p.hover("#navbarResponsive .nav-item:nth-child(2) .nav-link");
    await pause(500);
    await p.screenshot({ path: path.join(out, `${n}-desktop-navhover.png`) });
    // desktop: hover the first button / video preview / zoom photo the page has
    for (const [label, sel] of [
      ["btn", ".btn"],
      ["video", "a.video-facade"],
      ["zoomhs", "img.zoom-hs"],
      ["zoom", "img.zoom"],
    ]) {
      const target = await p.$(sel);
      if (!target) continue;
      await p.mouse.move(0, 0);
      await target.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await pause(400);
      await target.hover();
      await pause(600);
      await p.screenshot({
        path: path.join(out, `${n}-desktop-hover-${label}.png`),
      });
    }
    await p.close();
    process.stdout.write(n + " ");
  }
  await b.close();
  console.log();
})();
