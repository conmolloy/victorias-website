/**
 * Responsive-image attributes for a photo in public/, worked out at build
 * time from the files themselves:
 *   - width/height: read from the image file
 *   - srcset: the -400w / -800w / -1200w .webp thumbnails next to it (made by
 *     tools/make_thumbnails.py; only sizes smaller than the photo exist)
 * A missing photo or thumbnail stops the build with a message saying what to
 * do, so a typo in a data file can't reach the live site as a broken image.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const THUMB_WIDTHS = [400, 800, 1200];

export interface PhotoAttrs {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

const publicFile = (path: string) => join(process.cwd(), "public", path);

/** URL-encode each path segment (spaces → %20) the way make_thumbnails.py did */
export function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** width and height of a .webp image (lossy, lossless or extended format) */
export function webpSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  if (
    b.toString("ascii", 0, 4) !== "RIFF" ||
    b.toString("ascii", 8, 12) !== "WEBP"
  )
    throw new Error(`${file} is not a WebP image`);
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ")
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X")
    return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  throw new Error(`${file}: unknown WebP format ${chunk}`);
}

const cache = new Map<string, PhotoAttrs>();

/**
 * Attributes for a photo given by its path inside public/, e.g.
 * "assets/img/macbeth/1.webp" (spaces allowed, no %20).
 */
export function photo(path: string): PhotoAttrs {
  const cached = cache.get(path);
  if (cached) return cached;

  const file = publicFile(path);
  if (!existsSync(file))
    throw new Error(
      `Photo not found: public/${path}\n` +
        "Check the path in the data file (upper/lower case matters on the live server).",
    );
  if (!path.endsWith(".webp"))
    throw new Error(
      `Photo is not a .webp: public/${path}\n` +
        "Convert it first: uv run --with pillow python tools/optimize_images.py --apply",
    );

  const { width, height } = webpSize(file);
  const stem = path.slice(0, -".webp".length);
  const candidates: string[] = [];
  for (const w of THUMB_WIDTHS) {
    if (w >= width) continue;
    const thumb = `${stem}-${w}w.webp`;
    if (!existsSync(publicFile(thumb)))
      throw new Error(
        `Missing smaller version public/${thumb} of public/${path}\n` +
          "Make it with: uv run --with pillow python tools/make_thumbnails.py --apply",
      );
    candidates.push(`${encodePath(thumb)} ${w}w`);
  }
  candidates.push(`${encodePath(path)} ${width}w`);

  const attrs = {
    src: encodePath(path),
    srcset: candidates.join(", "),
    width,
    height,
  };
  cache.set(path, attrs);
  return attrs;
}
