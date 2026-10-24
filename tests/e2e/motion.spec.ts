// The motion: photo lightbox, sections fading in on scroll, page-to-page
// cross-fade – and that all of it stays out of the way.
import { expect, test, type Page } from "@playwright/test";
import { offline3rdParty, watch } from "./helpers";

test.beforeEach(({ page }) => offline3rdParty(page));

const dialog = (page: Page) => page.locator("dialog.lightbox");
const count = (page: Page) => page.locator(".lightbox-count");

for (const name of ["gallery", "headshot"]) {
  test(`${name}: a photo opens in the lightbox, browses, closes`, async ({
    page,
  }) => {
    const problems = watch(page);
    const requested: string[] = [];
    page.on("request", (r) => requested.push(decodeURI(r.url())));
    await page.goto(`/${name}.html`);
    await page.waitForLoadState("load");

    const links = page.locator("a.lightbox-link");
    const total = await links.count();
    expect(total).toBeGreaterThan(20);
    const second = links.nth(1);
    const fullSize = new URL((await second.getAttribute("href"))!, page.url())
      .href;
    // the full-size file isn't downloaded until the photo is opened
    expect(requested).not.toContain(decodeURI(fullSize));

    await second.click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
    await expect(count(page)).toHaveText(`2 / ${total}`);
    const thumb = second.locator("img");
    await expect(page.locator(".lightbox-alt")).toHaveText(
      (await thumb.getAttribute("alt"))!,
    );
    if (name === "gallery")
      // "<show> – <role>" from gallery.yaml
      await expect(page.locator(".lightbox-title")).toHaveText(/ – /);
    else
      await expect(page.locator(".lightbox-title")).toHaveText(
        /^Photography by .+, 20\d\d$/,
      );
    // then the full-size file replaces the thumbnail
    await expect
      .poll(() =>
        page
          .locator(".lightbox-img")
          .evaluate((img: HTMLImageElement) => img.src),
      )
      .toBe(fullSize);
    await expect
      .poll(() =>
        page
          .locator(".lightbox-img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth,
          ),
      )
      .toBeGreaterThan(0);

    // the page behind doesn't scroll
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);

    // keyboard: → / ← (wrapping round), Tab stays inside the lightbox
    await page.keyboard.press("ArrowRight");
    await expect(count(page)).toHaveText(`3 / ${total}`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(count(page)).toHaveText(`${total} / ${total}`);
    await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest("dialog.lightbox"),
        ),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "Next photo" }).click();
    await expect(count(page)).toHaveText(`2 / ${total}`);

    // Esc closes and puts the focus back on the photo that was showing
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    expect(
      await second.evaluate((link) => document.activeElement === link),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        document.documentElement.classList.contains("lightbox-open"),
      ),
    ).toBe(false);

    // ✕ and a click beside the photo close it too
    await links.first().click();
    await expect(count(page)).toHaveText(`1 / ${total}`);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(dialog(page)).toBeHidden();
    await links.first().click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).click({ position: { x: 8, y: 8 } });
    await expect(dialog(page)).toBeHidden();

    expect(problems).toEqual([]);
  });
}

test("lightbox: swipe left/right for next/previous", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "touch screen");
  await page.goto("/gallery.html");
  await page.locator("a.lightbox-link").first().click();
  await expect(dialog(page)).toBeVisible();
  const total = await page.locator("a.lightbox-link").count();
  const swipe = (dx: number) =>
    dialog(page).evaluate((el, dx) => {
      const touch = (x: number) =>
        new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
      el.dispatchEvent(
        new TouchEvent("touchstart", { touches: [touch(200)], bubbles: true }),
      );
      el.dispatchEvent(
        new TouchEvent("touchend", {
          changedTouches: [touch(200 + dx)],
          bubbles: true,
        }),
      );
    }, dx);
  await swipe(-120); // finger moves left: next
  await expect(count(page)).toHaveText(`2 / ${total}`);
  await swipe(120);
  await expect(count(page)).toHaveText(`1 / ${total}`);
  await swipe(20); // too short: nothing happens
  await expect(count(page)).toHaveText(`1 / ${total}`);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a photo link opens the full-size file; nothing is hidden", async ({
    page,
  }) => {
    await page.goto("/headshot.html");
    expect(await page.locator(".reveal").count()).toBe(0);
    const link = page.locator("a.lightbox-link").first();
    const href = (await link.getAttribute("href"))!;
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href.split("/").pop()}$`));
  });
});

test.describe("reveal on scroll", () => {
  test("first screen is shown at once; the rest fades in when scrolled to", async ({
    page,
  }) => {
    await page.goto("/gallery.html");
    await page.waitForLoadState("load");
    const states = await page
      .locator(".projects-clean .container .container > .row")
      .evaluateAll((rows) =>
        rows.map((r) => ({
          top: r.getBoundingClientRect().top,
          reveal: r.classList.contains("reveal"),
          opacity: getComputedStyle(r).opacity,
        })),
      );
    const viewport = page.viewportSize()!.height;
    // nothing on the first screen is hidden or waits
    for (const s of states.filter((s) => s.top < viewport)) {
      expect(s.reveal).toBe(false);
      expect(s.opacity).toBe("1");
    }
    // further down: hidden until scrolled to
    const later = page.locator(".reveal").last();
    expect(await later.evaluate((el) => getComputedStyle(el).opacity)).toBe(
      "0",
    );
    await later.scrollIntoViewIfNeeded();
    await expect(later).toHaveClass(/revealed/);
    await expect
      .poll(() => later.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");
  });

  test("no layout shift while scrolling through the page", async ({ page }) => {
    await page.goto("/headshot.html");
    await page.evaluate(() => {
      (window as unknown as { cls: number }).cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[])
          if (!entry.hadRecentInput)
            (window as unknown as { cls: number }).cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(800);
    expect(
      await page.evaluate(() => (window as unknown as { cls: number }).cls),
    ).toBeLessThan(0.01);
  });

  test("reduce motion: nothing is hidden, no transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/gallery.html");
    await page.waitForLoadState("load");
    expect(await page.locator(".reveal").count()).toBe(0);
    // the lightbox still works, without animation
    await page.locator("a.lightbox-link").first().click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
  });
});

test("page transitions: cross-fade on, navbar kept steady", async ({
  page,
}) => {
  await page.goto("/reviews.html");
  expect(
    await page
      .locator("#mainNav")
      .evaluate((nav) => getComputedStyle(nav).viewTransitionName),
  ).toBe("site-navbar");
  // opted in inline in <head>, so it's there before the stylesheet loads
  const optedIn = await page.evaluate(() =>
    [...document.head.querySelectorAll("style")].some((style) =>
      /@view-transition\s*{\s*navigation:\s*auto/.test(style.textContent ?? ""),
    ),
  );
  expect(optedIn).toBe(true);
});

test("page transitions: following a nav link cross-fades to the next page", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the nav links are in the collapsed menu on phones");
  const problems = watch(page);
  await page.addInitScript(() =>
    addEventListener("pagereveal", (event) => {
      (window as unknown as { transition: boolean }).transition =
        !!event.viewTransition;
    }),
  );
  await page.goto("/reviews.html");
  for (const next of ["headshot", "gallery", "resume", "showreel"]) {
    await page.locator(`#mainNav a.nav-link[href="${next}"]`).click();
    await page.waitForURL(`**/${next}`);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { transition?: boolean }).transition,
        ),
      )
      .toBe(true);
  }
  expect(problems).toEqual([]);
});
