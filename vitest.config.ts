/// <reference types="vitest/config" />
// Vitest with Astro's Vite setup (getViteConfig), as the Astro docs recommend,
// so tests can render .astro components with the Container API.
//   tests/unit  - components and helpers (npm test)
//   tests/dist  - checks on the built site in dist/ (npm run test:dist, after a build)
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/dist/**/*.test.ts"],
  },
});
