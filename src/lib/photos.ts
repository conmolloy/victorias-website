/**
 * Responsive-image attributes for a gallery or headshot photo in
 * src/assets/img/, made at build time with astro:assets:
 *   - width/height: read from the image file
 *   - srcset: 400, 800 and 1200px wide versions (only the sizes smaller than
 *     the photo) that Astro makes from the photo, plus the photo itself
 * Everything is written to dist/_astro/ under content-hashed file names, so
 * a changed photo always gets a new address.
 * A missing photo stops the build with a message saying where to look, so a
 * typo in a data file can't reach the live site as a broken image.
 */
import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

const THUMB_WIDTHS = [400, 800, 1200];

export interface PhotoAttrs {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

// every photo under src/assets/img/, by its path inside src/
// ("assets/img/macbeth/1.webp")
const images = import.meta.glob<ImageMetadata>("/src/assets/img/**/*.webp", {
  eager: true,
  import: "default",
});
const byPath = new Map(
  Object.entries(images).map(([key, image]) => [
    key.slice("/src/".length),
    image,
  ]),
);

/**
 * Escape spaces and accented letters in an address (file names may contain
 * them, and a space would split a srcset entry). Everything else is left
 * as it is: `npm run dev` addresses are already escaped.
 */
const encode = (url: string) =>
  url.replace(/[^!-~]/gu, (c) => encodeURIComponent(c));

const cache = new Map<string, Promise<PhotoAttrs>>();

/**
 * Attributes for a photo given by its path inside src/, as written in the
 * data files, e.g. "assets/img/macbeth/1.webp" (spaces allowed, no %20).
 */
export function photo(path: string): Promise<PhotoAttrs> {
  let attrs = cache.get(path);
  if (!attrs) {
    attrs = makeAttrs(path);
    cache.set(path, attrs);
  }
  return attrs;
}

async function makeAttrs(path: string): Promise<PhotoAttrs> {
  const image = byPath.get(path);
  if (!image)
    throw new Error(
      `Photo not found: src/${path}\n` +
        "Check the path in the data file (upper/lower case matters).",
    );
  const { width, height } = image;
  const candidates: string[] = [];
  for (const w of THUMB_WIDTHS) {
    if (w >= width) continue;
    const thumb = await getImage({ src: image, width: w, format: "webp" });
    candidates.push(`${encode(thumb.src)} ${w}w`);
  }
  // the photo itself is served as it is (Astro copies it unchanged)
  const src = encode(image.src);
  candidates.push(`${src} ${width}w`);
  return { src, srcset: candidates.join(", "), width, height };
}
