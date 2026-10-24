// Search listings and link previews in the built site: every page has its
// own title and description, complete Open Graph / Twitter card tags with
// absolute URLs, a canonical link; the preview image exists at the declared
// size; sitemap.xml and robots.txt list/point to the right places.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAGES, SHARE_IMAGE, SITE_URL } from "../../src/lib/site";

const DIST = "dist";
if (!existsSync(DIST)) throw new Error("No dist/ - run `npm run build` first.");

const pages = readdirSync(DIST).filter((f) => f.endsWith(".html"));
const html = Object.fromEntries(
  pages.map((p) => [p, readFileSync(join(DIST, p), "utf8")]),
);

/** content of <meta property|name="key"> (attribute order as Astro writes it) */
const meta = (page: string, key: string) =>
  [
    ...html[page].matchAll(
      new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`, "g"),
    ),
  ].map((m) => m[1]);

const decode = (s: string) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const canonicalPath = (page: string) =>
  page === "index.html" ? "/" : `/${page.replace(/\.html$/, "")}`;

/** width and height of a JPEG, from its SOF marker */
function jpegSize(file: string) {
  const b = readFileSync(file);
  expect(b.readUInt16BE(0)).toBe(0xffd8); // a JPEG
  let i = 2;
  while (i < b.length) {
    const marker = b.readUInt16BE(i);
    const length = b.readUInt16BE(i + 2);
    if (marker >= 0xffc0 && marker <= 0xffc2)
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + length;
  }
  throw new Error("no SOF marker");
}

describe.each(pages)("dist/%s", (page) => {
  it("has a description, canonical link and every link-preview tag", () => {
    const url = SITE_URL + canonicalPath(page);
    expect(html[page]).toContain(`<link rel="canonical" href="${url}">`);
    expect(meta(page, "og:url")).toEqual([url]);
    for (const key of [
      "description",
      "og:type",
      "og:site_name",
      "og:locale",
      "og:title",
      "og:description",
      "og:image",
      "og:image:type",
      "og:image:width",
      "og:image:height",
      "og:image:alt",
      "twitter:card",
      "twitter:title",
      "twitter:description",
      "twitter:image",
      "twitter:image:alt",
    ]) {
      const values = meta(page, key);
      expect(values, key).toHaveLength(1);
      expect(values[0].trim(), key).not.toBe("");
    }
    expect(meta(page, "og:image")[0]).toBe(SITE_URL + SHARE_IMAGE.path);
    expect(meta(page, "twitter:image")[0]).toBe(SITE_URL + SHARE_IMAGE.path);
    expect(meta(page, "twitter:card")[0]).toBe("summary_large_image");
    expect(meta(page, "og:locale")[0]).toBe("en_GB");
    expect(meta(page, "og:type")[0]).toBe(
      page === "index.html" ? "profile" : "website",
    );
  });

  it("uses the page title as the preview headline", () => {
    const title = html[page].match(/<title>([^<]+)<\/title>/)![1];
    expect(meta(page, "og:title")[0]).toBe(title);
    expect(meta(page, "twitter:title")[0]).toBe(title);
  });

  it("keeps the description short enough for search results", () => {
    const description = decode(meta(page, "description")[0]);
    expect(description.length).toBeGreaterThan(30);
    expect(description.length).toBeLessThanOrEqual(160);
  });
});

describe("site", () => {
  it("gives every page its own title and description", () => {
    const titles = pages.map((p) => html[p].match(/<title>([^<]+)</)![1]);
    const descriptions = pages.map((p) => meta(p, "description")[0]);
    expect(new Set(titles).size).toBe(pages.length);
    expect(new Set(descriptions).size).toBe(pages.length);
  });

  it("has a canonical address for every built page, and a page for every canonical address", () => {
    expect(pages.map(canonicalPath).sort()).toEqual([...PAGES].sort());
  });

  it("has the link-preview image at the declared size", () => {
    const file = join(DIST, SHARE_IMAGE.path);
    expect(jpegSize(file)).toEqual({
      width: SHARE_IMAGE.width,
      height: SHARE_IMAGE.height,
    });
    expect(readFileSync(file).length).toBeLessThan(300 * 1024);
  });

  it("describes Victoria as a Person on the home page (JSON-LD)", () => {
    const json = html["index.html"].match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )?.[1];
    const person = JSON.parse(json ?? "null");
    expect(person).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Victoria Adler",
      jobTitle: "Actor",
      url: `${SITE_URL}/`,
      image: SITE_URL + SHARE_IMAGE.path,
    });
    expect(person.sameAs).toEqual([
      "https://www.spotlight.com/0456-8977-3433",
      "https://www.imdb.com/name/nm8555965/?ref_=nmbio_bio_nm",
      "https://www.instagram.com/vickanadler",
    ]);
  });

  it("ships the editing screen at /admin, hidden from search engines", () => {
    const admin = readFileSync(join(DIST, "admin", "index.html"), "utf8");
    expect(admin).toContain('<meta name="robots" content="noindex"');
    expect(admin).toMatch(/@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js/);
    expect(existsSync(join(DIST, "admin", "config.yml"))).toBe(true);
    expect(readFileSync(join(DIST, "robots.txt"), "utf8")).toContain(
      "Disallow: /admin/",
    );
  });

  it("lists every page in sitemap.xml, and robots.txt points to it", () => {
    const sitemap = readFileSync(join(DIST, "sitemap.xml"), "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(PAGES.map((p) => SITE_URL + p));
    expect(readFileSync(join(DIST, "robots.txt"), "utf8")).toContain(
      `Sitemap: ${SITE_URL}/sitemap.xml`,
    );
  });
});
