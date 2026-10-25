// Feedback mode (src/scripts/feedback.ts) with the GitHub API mocked – no
// real issues are created.
import { expect, test, type Page, type Request } from "@playwright/test";
import { offline3rdParty, watch } from "./helpers";

test.beforeEach(({ page }) => offline3rdParty(page));

const signIn = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem(
      "sveltia-cms.user",
      JSON.stringify({ backendName: "github", token: "test-token" }),
    ),
  );

/** answers the GitHub API like it would; returns the requests it got */
async function mockGitHub(page: Page, issueStatus = 201) {
  const requests: Request[] = [];
  await page.route("https://api.github.com/**", async (route) => {
    requests.push(route.request());
    const url = route.request().url();
    // the label exists already
    if (url.endsWith("/labels/site-feedback"))
      return route.fulfill({ json: { name: "site-feedback" } });
    return route.fulfill({
      status: issueStatus,
      json:
        issueStatus === 201
          ? {
              number: 123,
              html_url:
                "https://github.com/conmolloy/victorias-website/issues/123",
            }
          : { message: "Resource not accessible by personal access token" },
    });
  });
  return requests;
}

test("visitors don't load feedback mode", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (r) => scripts.push(r.url()));
  await page.goto("/gallery.html");
  await page.waitForLoadState("load");
  expect(scripts.filter((u) => /feedback/.test(u))).toEqual([]);
  await expect(page.locator("[data-feedback-ui]")).toHaveCount(0);
});

test("feedback mode: pick a photo, send, the issue says what and where", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "mouse; the phone's tap-twice is checked below");
  const problems = watch(page);
  await signIn(page);
  const requests = await mockGitHub(page);
  await page.goto("/gallery.html?feedback");
  await expect(
    page.getByRole("region", { name: "Feedback mode" }),
  ).toBeVisible();

  // links don't navigate and the lightbox doesn't open; the photo is picked
  const photo = page.locator("a.lightbox-link img").first();
  await photo.hover();
  await expect(page.locator(".fb-outline")).toBeVisible();
  await photo.click();
  await expect(page.locator("dialog.lightbox")).toBeHidden();
  await expect(page).toHaveURL(/gallery\.html\?feedback$/);
  const box = page.getByRole("textbox", {
    name: "What would you like changed?",
  });
  await expect(box).toBeFocused();
  await box.fill("Please make this photo bigger");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("link", { name: "#123" })).toHaveAttribute(
    "href",
    "https://github.com/conmolloy/victorias-website/issues/123",
  );

  const issue = requests.find((r) => r.url().endsWith("/issues"))!;
  expect(issue.method()).toBe("POST");
  expect(issue.headers()["authorization"]).toBe("Bearer test-token");
  const { title, body, labels } = issue.postDataJSON();
  expect(title).toBe("Feedback: Please make this photo bigger");
  expect(labels).toEqual(["site-feedback"]);
  expect(body).toMatch(/^Please make this photo bigger\n/);
  expect(body).toMatch(
    /\*\*Page:\*\* \[Gallery – Victoria Adler\]\(http:\/\/localhost:\d+\/gallery\.html\)/,
  );
  expect(body).toContain("**Where:** Gallery › Acting › Treasure Island");
  expect(body).toMatch(
    /\*\*Element:\*\* `img` – `.*a\.lightbox-link > img\.img-fluid`/,
  );
  expect(body).toMatch(/\*\*Image:\*\* `[^`]+\.webp` – “.+”/);
  expect(body).toMatch(/\*\*Screen:\*\* \d+×\d+ \(desktop\)/);

  // still on after moving to another page; Exit switches it off
  await page.getByRole("button", { name: "Close" }).click();
  await page.goto("/reviews.html");
  await expect(
    page.getByRole("region", { name: "Feedback mode" }),
  ).toBeVisible();
  // a link doesn't navigate in feedback mode
  await page.getByRole("link", { name: "Read Review" }).first().click();
  await expect(page).toHaveURL(/reviews\.html$/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".fb-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Exit" }).click();
  await expect(page.locator("[data-feedback-ui]")).toHaveCount(0);
  await page.locator('#mainNav a.nav-link[href="gallery"]').click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.locator("[data-feedback-ui]")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("feedback mode on a phone: first tap outlines, second tap picks", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "touch screen");
  await signIn(page);
  await page.goto("/index.html?feedback");
  const name = page.locator("#about > h1");
  await name.tap();
  await expect(page.locator(".fb-outline")).toBeVisible();
  await expect(page.locator(".fb-panel")).toHaveCount(0);
  await name.tap();
  await expect(page.locator(".fb-panel")).toBeVisible();
});

test("feedback mode explains what to do without a sign-in or permission", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "checked at desktop width");
  const requests = await mockGitHub(page, 403);
  await page.goto("/reviews.html?feedback");
  await page.locator(".reviews-title").click();
  await page.getByRole("textbox").fill("Bigger title please");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".fb-panel")).toContainText(
    "Sign in to the editing screen first",
  );
  expect(requests).toEqual([]);

  await page.evaluate(() =>
    localStorage.setItem(
      "sveltia-cms.user",
      JSON.stringify({ backendName: "github", token: "test-token" }),
    ),
  );
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".fb-panel")).toContainText(
    "Issues: Read and write",
  );
});
