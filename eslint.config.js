// ESLint (flat config): JavaScript/TypeScript, Astro components
// (eslint-plugin-astro, as recommended in the Astro docs) and accessibility
// checks for the page markup (jsx-a11y rules adapted to Astro).
import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist/",
    ".astro/",
    "**/node_modules/",
    "perf/",
    "playwright-report/",
    "test-results/",
    // third-party / minified files served as-is
    "public/assets/**/*.min.js",
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs["flat/recommended"],
  astro.configs["flat/jsx-a11y-recommended"],
  {
    // Accessibility gaps in the existing pages (images without alt text,
    // audio/video without captions) are reported as warnings until they're
    // fixed (see PLAN.md); new code should not add more.
    files: ["**/*.astro"],
    rules: Object.fromEntries(
      Object.entries(astro.configs["flat/jsx-a11y-recommended"].at(-1).rules)
        .filter(
          ([rule, level]) =>
            rule.startsWith("astro/jsx-a11y/") && level !== "off",
        )
        .map(([rule]) => [rule, "warn"]),
    ),
  },
  {
    // <script is:inline> blocks are shipped exactly as written (classic
    // browser scripts, e.g. the Google Tag Manager snippet), so ES5 style is fine
    files: [
      "**/*.astro/*.js",
      "*.astro/*.js",
      "**/*.astro/*.ts",
      "*.astro/*.ts",
    ],
    rules: { "no-var": "off" },
  },

  // the site's own browser scripts (plain scripts, loaded after jQuery)
  {
    files: ["public/assets/js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, jQuery: "readonly" },
    },
  },

  // Node maintenance scripts (CommonJS)
  {
    files: ["tools/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // ...whose page.evaluate() callbacks run in the browser
  {
    files: ["tools/visual-check/**/*.js", "tools/trim-css/**/*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, jQuery: "readonly" },
    },
  },
]);
