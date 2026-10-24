// @ts-check
import { defineConfig } from "astro/config";

/**
 * `npm run dev` only: open the editing screen (public/admin/index.html) at
 * /admin and /admin/ too, like the live server does (/admin redirects to
 * /admin/, so the page finds its config.yml next to it).
 * @type {import("astro").AstroIntegration}
 */
const adminInDev = {
  name: "admin-in-dev",
  hooks: {
    "astro:server:setup": ({ server }) => {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/admin") {
          res.statusCode = 301;
          res.setHeader("Location", "/admin/");
          res.end();
          return;
        }
        if (req.url === "/admin/") req.url = "/admin/index.html";
        next();
      });
    },
  },
};

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
  integrations: [adminInDev],
});
