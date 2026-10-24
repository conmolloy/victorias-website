// End-to-end tests of the production build (as the Astro docs recommend):
// `npm run build` first, then `npm run test:e2e` starts `astro preview`.
// Uses the installed Google Chrome (channel "chrome"), so there's no browser
// download; GitHub's Ubuntu runners have Chrome too.
import { defineConfig, devices } from "@playwright/test";

// not 4321 (npm run dev's port), so a dev server that's running can't be
// mistaken for the build being tested
const PORT = 4329;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 800 },
      },
    },
    {
      name: "phone",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    // always test a fresh `astro preview` of this build
    reuseExistingServer: false,
  },
});
