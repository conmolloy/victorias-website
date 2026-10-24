// Behaviour of the built site in a real browser, at desktop and phone width.
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["index", "gallery", "headshot", "resume", "reviews", "showreel"];

// Never send analytics from tests, and don't depend on Vimeo/YouTube.
test.beforeEach(async ({ page }) => {
  await page.route(
    /googletagmanager\.com|google-analytics\.com|doubleclick\.net|googleadservices\.com|google\.com\/(?:pagead|ccm)/,
    (route) => route.abort(),
  );
  await page.route(/player\.vimeo\.com|youtube(?:-nocookie)?\.com/, (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>player</title>" }),
  );
});

/** Collects console errors, page errors and failed local requests. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text()))
      problems.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith("http://localhost"))
      problems.push(`${r.status()} ${r.url()}`);
  });
  return problems;
}

for (const name of PAGES) {
  test.describe(`${name}.html`, () => {
    test("loads without errors, icons and fonts in place", async ({ page }) => {
      const problems = watch(page);
      await page.goto(`/${name}.html`);
      await page.waitForLoadState("load");
      await expect(page.locator("#mainNav")).toBeVisible();
      // Font Awesome icon glyph renders with the icon font
      const icon = await page
        .locator(".fa")
        .first()
        .evaluate((el) => ({
          content: getComputedStyle(el, "::before").content,
          font: getComputedStyle(el).fontFamily,
        }));
      expect(icon.content).not.toMatch(/^(none|""|normal)$/);
      expect(icon.font).toMatch(/FontAwesome/i);
      // jQuery and Bootstrap 4's script are gone for good
      expect(await page.evaluate(() => "jQuery" in window)).toBe(false);
      expect(problems).toEqual([]);
    });
  });
}

test("phone menu opens and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the menu button only shows on small screens");
  await page.goto("/headshot.html");
  const menu = page.locator("#navbarResponsive");
  await expect(menu).toBeHidden();
  await page.locator(".navbar-toggler").click();
  await expect(menu).toHaveClass(/\bshow\b/);
  await expect(menu.getByRole("link", { name: "Reviews" })).toBeVisible();
  await page.locator(".navbar-toggler").click();
  await expect(menu).not.toHaveClass(/\bshow\b/);
});

// common phone widths, from the smallest still in use (320px) up
const PHONE_WIDTHS = [320, 360, 375, 390, 430];

for (const name of PAGES) {
  test(`${name}.html fits phone screens (no sideways scrolling)`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "phone widths only");
    for (const width of PHONE_WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/${name}.html`);
      await page.waitForLoadState("load");
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll, `${name}.html at ${width}px`).toBeLessThanOrEqual(client);
    }
  });
}

test("navbar shrinks after scrolling", async ({ page }) => {
  await page.goto("/headshot.html");
  const nav = page.locator("#mainNav");
  await expect(nav).not.toHaveClass(/navbar-shrink/);
  await page.mouse.wheel(0, 600);
  await expect(nav).toHaveClass(/navbar-shrink/);
});

test("nav links reach every page", async ({ page, isMobile }) => {
  for (const [label, title] of [
    ["CV", "CV – Victoria Adler"],
    ["Showreel", "Showreel – Victoria Adler"],
    ["Portfolio", "Headshots – Victoria Adler"],
    ["Gallery", "Gallery – Victoria Adler"],
    ["Reviews", "Reviews – Victoria Adler"],
    ["Home", "Victoria Adler – Actor"],
  ]) {
    await page.goto("/reviews.html");
    if (isMobile) await page.locator(".navbar-toggler").click();
    await page
      .locator("#navbarResponsive")
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveTitle(title);
  }
});

test("gallery buttons scroll smoothly to their section", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "checked at desktop width");
  await page.goto("/gallery.html");
  await page.locator('a.galbtn[href="#video-section"]').click();
  // BaseLayout's script animates the scroll, leaving 48px for the navbar
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.round(
          document.querySelector("#video-section")!.getBoundingClientRect().top,
        ),
      ),
    )
    .toBeLessThanOrEqual(50);
  expect(page.url()).not.toContain("#video-section"); // handled by JS, not a jump
});

test("gallery video previews load the player on click, same size", async ({
  page,
}) => {
  await page.goto("/gallery.html");
  const previews = page.locator("a.video-facade");
  await expect(previews).toHaveCount(7);
  const first = previews.first();
  const embed = await first.getAttribute("data-embed");
  await first.scrollIntoViewIfNeeded();
  const before = await first.boundingBox();
  await first.click();
  const player = page.locator(`iframe[src="${embed}"]`);
  await expect(player).toBeVisible();
  const after = await player.boundingBox();
  expect(Math.round(after!.width)).toBe(Math.round(before!.width));
  expect(Math.round(after!.height)).toBe(Math.round(before!.height));
  await expect(previews).toHaveCount(6);
});

test("CV page renders the PDF", async ({ page }) => {
  await page.goto("/resume.html");
  const canvas = page.locator("#pdf-canvas");
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width), {
      timeout: 15000,
    })
    .toBeGreaterThan(0);
  // something was drawn (not a blank canvas)
  const ink = await canvas.evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < data.length; i += 40) if (data[i] < 200) dark++;
    return dark;
  });
  expect(ink).toBeGreaterThan(100);
  await expect(
    page.getByRole("link", { name: "Download PDF" }),
  ).toHaveAttribute("href", "assets/cv/VICTORIA ADLER CV 2025.pdf");
});

test("Google Tag Manager waits for the visitor", async ({ page }) => {
  const gtm: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("googletagmanager.com/gtm.js")) gtm.push(r.url());
  });
  await page.goto("/reviews.html");
  await page.waitForLoadState("load");
  expect(gtm).toEqual([]); // not during page load
  await page.mouse.wheel(0, 200); // first interaction
  await expect.poll(() => gtm.length).toBe(1);
  expect(gtm[0]).toContain("id=GTM-NXB648G");
});
