// Stylelint: catches mistakes (invalid properties, unknown units, duplicate
// selectors...) in the site's own CSS and in <style> blocks of .astro files.
// Vendor CSS (Bootstrap, Font Awesome) is skipped.
/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-recommended", "stylelint-config-html/astro"],
  rules: {
    // would mean reordering existing rules, which can change the cascade
    "no-descending-specificity": null,
  },
  ignoreFiles: [
    "dist/**",
    "**/node_modules/**",
    "public/assets/bootstrap/**",
    "public/assets/fonts/**",
    "perf/**",
  ],
};
