// Shared by the end-to-end tests.
import type { Page } from "@playwright/test";

// Never send analytics from tests, and don't depend on Vimeo/YouTube.
export async function offline3rdParty(page: Page) {
  await page.route(
    /googletagmanager\.com|google-analytics\.com|doubleclick\.net|googleadservices\.com|google\.com\/(?:pagead|ccm)/,
    (route) => route.abort(),
  );
  await page.route(/player\.vimeo\.com|youtube(?:-nocookie)?\.com/, (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>player</title>" }),
  );
}

/** Collects console errors, page errors and failed local requests. */
export function watch(page: Page) {
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
