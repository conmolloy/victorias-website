// Checks on the built site (run `npm run build` first; CI and the deploy do).
// Catches what visitors would hit on the live server:
//  - a missing image/video/CSS file, or one whose name differs only in case
//    (Windows doesn't care, the Linux server does: 3 headshots 404'd once)
//  - a CSS/JS link without the right ?v= content hash (returning visitors
//    would keep a stale 30-day cached copy)
//  - a nav link to a page that doesn't exist
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const DIST = "dist";
if (!existsSync(DIST)) throw new Error("No dist/ - run `npm run build` first.");

const pages = readdirSync(DIST).filter((f) => f.endsWith(".html"));

/** true if the path exists with exactly this upper/lower case */
function existsExactCase(rel: string): boolean {
  let dir = DIST;
  for (const part of rel.split("/")) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
    if (!readdirSync(dir).includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
}

const decode = (s: string) =>
  decodeURIComponent(
    s
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'"),
  );

const isLocal = (url: string) =>
  url !== "" && !/^(?:[a-z]+:|\/\/|#)/i.test(url) && !url.startsWith("/");

/** local files referenced by a page (comments ignored) */
function references(html: string): string[] {
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  const refs: string[] = [];
  for (const m of html.matchAll(/\b(?:src|href|poster)="([^"]*)"/g))
    refs.push(m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]*)"/g))
    for (const candidate of m[1].split(","))
      refs.push(candidate.trim().split(/\s+/)[0]);
  for (const m of html.matchAll(/url\((?:&quot;|["'])?(.*?)(?:&quot;|["'])?\)/g))
    refs.push(m[1]);
  return refs
    .map((r) => r.split("#")[0])
    .filter(isLocal)
    .map((r) => decode(r.split("?")[0]));
}

const NAV_PAGES = ["resume", "showreel", "headshot", "gallery", "reviews"];

describe.each(pages)("dist/%s", (page) => {
  const html = readFileSync(join(DIST, page), "utf8");

  it("only references files that exist (exact case)", () => {
    const missing = references(html).filter(
      (ref) => !NAV_PAGES.includes(ref) && !existsExactCase(ref),
    );
    expect(missing).toEqual([]);
  });

  it("versions every local CSS/JS link with the file's current hash", () => {
    const links = [
      ...html.matchAll(/\b(?:href|src)="(assets\/[^"]+\.(?:css|js))(\?[^"]*)?"/g),
    ];
    expect(links.length).toBeGreaterThan(0);
    for (const [, path, query] of links) {
      const hash = createHash("md5")
        .update(readFileSync(join(DIST, path)))
        .digest("hex")
        .slice(0, 8);
      expect(`${path}${query ?? ""}`).toBe(`${path}?v=${hash}`);
    }
  });

  it("has the bundled scripts it loads (/_astro/, content-hashed names)", () => {
    const scripts = [...html.matchAll(/<script[^>]* src="\/(_astro\/[^"]+)"/g)];
    expect(scripts.length).toBeGreaterThan(0); // the navbar's
    for (const [, path] of scripts) expect(existsExactCase(path)).toBe(true);
  });

  it("has lang=en, the favicon, a title and Google Tag Manager", () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('rel="shortcut icon"');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html.match(/GTM-NXB648G/g)?.length).toBe(2); // script + noscript
  });
});

describe("site", () => {
  it("has a page for every nav link", () => {
    for (const p of [...NAV_PAGES, "index"])
      expect(pages).toContain(`${p}.html`);
  });

  it("has every font and image the CSS files use", () => {
    const missing: string[] = [];
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith(".css") ? [p] : [];
      });
    for (const css of walk(join(DIST, "assets"))) {
      // the full Bootstrap/Font Awesome sources aren't loaded by any page
      if (css.includes(".full.")) continue;
      const text = readFileSync(css, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        const url = m[1].split(/[?#]/)[0];
        if (!isLocal(url) || url.startsWith("data:")) continue;
        const rel = join(dirname(css), decodeURIComponent(url))
          .slice(DIST.length + 1)
          .replace(/\\/g, "/");
        if (!existsExactCase(rel)) missing.push(`${css}: ${url}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
