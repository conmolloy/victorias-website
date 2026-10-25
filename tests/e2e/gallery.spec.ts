// The gallery's cover cards: filters, and a card opening its own photos in
// the lightbox.
import { expect, test } from "@playwright/test";
import { offline3rdParty, watch } from "./helpers";

test.beforeEach(({ page }) => offline3rdParty(page));

const visibleCards = (page: import("@playwright/test").Page) =>
  page.locator(".show-card:not([hidden])");

test("filters show one kind of card, and the address can be shared", async ({
  page,
}) => {
  await page.goto("/gallery.html");
  const all = await page.locator(".show-card").count();
  expect(all).toBeGreaterThan(10);
  await expect(visibleCards(page)).toHaveCount(all);

  await page.getByRole("button", { name: "Dance" }).click();
  await expect(page).toHaveURL(/#dance$/);
  await expect(page.getByRole("button", { name: "Dance" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(visibleCards(page)).toHaveCount(1);
  await expect(visibleCards(page).locator(".show-title")).toHaveText("Dance");

  await page.getByRole("button", { name: "All" }).click();
  await expect(visibleCards(page)).toHaveCount(all);
  expect(new URL(page.url()).hash).toBe("");

  // opening a shared address applies its filter
  await page.goto("/gallery.html#stage-combat");
  await expect(visibleCards(page)).toHaveCount(1);
  await expect(visibleCards(page).locator(".show-title")).toHaveText(
    "Stage combat certificates",
  );
});

test("a card opens its own photos in the lightbox, then back to the card", async ({
  page,
}) => {
  const problems = watch(page);
  await page.goto("/gallery.html");
  const card = page.locator(".show-card").first();
  const photos = await card.locator("a.lightbox-link").count();
  expect(photos).toBeGreaterThan(1);
  // only the cover's thumbnail is downloaded, not the card's other photos
  const hidden = card.locator("a.lightbox-link[hidden] img").first();
  expect(
    await hidden.evaluate(
      (img: HTMLImageElement) => img.complete && img.naturalWidth,
    ),
  ).toBeFalsy();

  await card.locator("a.show-cover").click();
  const dialog = page.locator("dialog.lightbox");
  await expect(dialog).toBeVisible();
  await expect(page.locator(".lightbox-count")).toHaveText(`1 / ${photos}`);
  const title = await card.locator(".show-title").textContent();
  await expect(page.locator(".lightbox-title")).toContainText(title!.trim());
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".lightbox-count")).toHaveText(`2 / ${photos}`);
  await expect
    .poll(() =>
      page
        .locator(".lightbox-img")
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth),
    )
    .toBeGreaterThan(0);
  // closing on a photo that isn't on the page goes back to its card
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(
    await card
      .locator("a.show-cover")
      .evaluate((link) => document.activeElement === link),
  ).toBe(true);
  expect(problems).toEqual([]);
});

test("audio and videos still work under the cards", async ({ page }) => {
  await page.goto("/gallery.html");
  await expect(page.locator("audio").first()).toBeAttached();
  await expect(page.locator("a.video-facade").first()).toBeAttached();
  await expect(page.locator("#audio-section")).toBeAttached();
  await expect(page.locator("#video-section")).toBeAttached();
});
