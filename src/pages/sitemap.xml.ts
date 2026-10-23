// sitemap.xml for search engines: every page's canonical address
// (src/lib/site.ts). Built into dist/sitemap.xml; robots.txt points to it.
import type { APIRoute } from "astro";
import { PAGES, SITE_URL } from "../lib/site";

export const GET: APIRoute = () => {
  const urls = PAGES.map(
    (path) => `  <url><loc>${SITE_URL}${path}</loc></url>`,
  );
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
