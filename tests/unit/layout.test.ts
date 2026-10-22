// Renders the shared components with Astro's Container API and checks the
// per-page options do what the pages rely on.
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import GoogleTagManager from "../../src/components/GoogleTagManager.astro";
import Navbar from "../../src/components/Navbar.astro";
import BaseLayout from "../../src/layouts/BaseLayout.astro";

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (props: Record<string, unknown>) =>
  container.renderToString(BaseLayout, {
    props: { title: "Test", preloads: [], ...props },
    slots: { default: "<main>page content</main>" },
  });

describe("BaseLayout", () => {
  it("renders the title, page content and the end-of-body scripts in order", async () => {
    const html = await render({ title: "Gallery" });
    expect(html).toContain("<title>Gallery</title>");
    expect(html).toContain("<main>page content</main>");
    const scripts = [...html.matchAll(/<script src="([^"?]+)\?v=/g)].map(
      (m) => m[1],
    );
    expect(scripts).toEqual([
      "assets/js/jquery.min.js",
      "assets/bootstrap/js/bootstrap.min.js",
      "assets/js/grayscale.js",
    ]);
  });

  it("versions every local stylesheet, in cascade order", async () => {
    const html = await render({ outfit: true, siteBase: true });
    const sheets = [
      ...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g),
    ].map((m) => m[1]);
    expect(sheets.map((s) => s.replace(/\?v=[0-9a-f]{8}$/, ""))).toEqual([
      "assets/css/fonts.css",
      "assets/bootstrap/css/bootstrap.min.css",
      "assets/css/font-outfit.css",
      "assets/css/font-roboto.css",
      "assets/fonts/font-awesome.min.css",
      "assets/css/Projects-Clean.css",
      "assets/css/site-base.css",
    ]);
    for (const s of sheets) expect(s).toMatch(/\?v=[0-9a-f]{8}$/);
  });

  it("only loads Outfit and site-base.css when asked", async () => {
    const html = await render({});
    expect(html).not.toContain("font-outfit.css");
    expect(html).not.toContain("site-base.css");
  });

  it("preloads the given fonts, in order", async () => {
    const html = await render({
      preloads: ["lora-latin.woff2", "roboto-400-latin.woff2"],
    });
    const preloads = [
      ...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g),
    ].map((m) => m[1]);
    expect(preloads).toEqual([
      "assets/fonts/lora-latin.woff2",
      "assets/fonts/roboto-400-latin.woff2",
    ]);
  });

  it("handles lang, favicon and body attributes", async () => {
    const plain = await render({});
    expect(plain).toMatch(/<html>/);
    expect(plain).toContain('href="favicon.ico"');
    expect(plain).toMatch(/<body>/);

    const custom = await render({
      lang: "en",
      favicon: false,
      bodyId: "page-top",
      bodyStyle: "padding-top: 100px",
    });
    expect(custom).toContain('<html lang="en">');
    expect(custom).not.toContain("favicon.ico");
    expect(custom).toContain('<body id="page-top" style="padding-top: 100px">');
  });

  it("includes Google Tag Manager and its noscript fallback", async () => {
    const html = await render({});
    expect(html).toContain("GTM-NXB648G");
    expect(html).toContain(
      '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NXB648G"',
    );
  });
});

describe("GoogleTagManager", () => {
  it("only changes on purpose (deferred loading, verified against GA4/Ads on 2026-10-22)", async () => {
    // Deliberately changing the snippet? Re-verify on the live site that
    // GA4 page_view and the Ads tags still fire, then update this hash.
    const source = readFileSync(
      "src/components/GoogleTagManager.astro",
      "utf8",
    );
    const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
    expect(
      createHash("sha256")
        .update(script ?? "")
        .digest("hex"),
    ).toBe("877fee689dd544a2a1e196329865530067c39b3d2d9fa4191cc7441f6c057441");

    const html = await container.renderToString(GoogleTagManager);
    expect(html).toContain(`<script>${script}</script>`);
  });
});

describe("Navbar", () => {
  it("links to every page and uses the given brand link", async () => {
    const html = await container.renderToString(Navbar, {
      props: { brandHref: "#" },
    });
    expect(html).toContain('class="navbar-brand js-scroll-trigger" href="#"');
    const links = [
      ...html.matchAll(/<a class="nav-link[^"]*" href="([^"]+)"/g),
    ].map((m) => m[1]);
    expect(links).toEqual([
      "/",
      "resume",
      "showreel",
      "headshot",
      "gallery",
      "reviews",
      "https://www.spotlight.com/0456-8977-3433",
      "https://www.imdb.com/name/nm8555965/?ref_=nmbio_bio_nm",
      "https://www.instagram.com/vickanadler",
    ]);
  });
});
