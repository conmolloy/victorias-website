// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  build: {
    // gallery.astro -> dist/gallery.html, same URLs as the old static site
    format: "file",
  },
  // keep the markup exactly as written: whitespace between inline elements
  // (buttons, images, icons) is visible on the page
  compressHTML: false,
  // no dev toolbar overlay while comparing against the old site
  devToolbar: { enabled: false },
});
