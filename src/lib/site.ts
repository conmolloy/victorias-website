/** Facts about the site used in more than one place (head tags, navbar, sitemap). */

/** The live site, for absolute URLs in link previews, canonical links and the sitemap. */
export const SITE_URL = "https://victoriaadler.co.uk";

export const SITE_NAME = "Victoria Adler";

/**
 * Every page's canonical path: the extension-less address the navbar links
 * to (the server serves /gallery and /gallery.html alike).
 */
export const PAGES = [
  "/",
  "/resume",
  "/showreel",
  "/headshot",
  "/gallery",
  "/reviews",
] as const;

/** Image shown when a link to the site is shared (tools/make_share_image.py). */
export const SHARE_IMAGE = {
  path: "/assets/img/share/victoria-adler.jpg",
  width: 1200,
  height: 630,
  alt: "Victoria Adler, headshot by Michael Shelford, 2024",
};

/** Victoria's profiles elsewhere: navbar logos and structured data (sameAs). */
export const PROFILES = [
  {
    href: "https://www.spotlight.com/0456-8977-3433",
    name: "Spotlight",
    logo: "assets/img/logos/spotlight.png",
  },
  {
    href: "https://www.imdb.com/name/nm8555965/?ref_=nmbio_bio_nm",
    name: "IMDb",
    logo: "assets/img/logos/imdb.webp",
  },
  {
    href: "https://www.instagram.com/vickanadler",
    name: "Instagram",
    logo: "assets/img/logos/instagram.webp",
  },
  // { href: "https://www.facebook.com/vadler3", name: "Facebook", logo: "assets/img/logos/facebook.webp" },
];
