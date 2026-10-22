import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const versions = new Map<string, string>();

/**
 * Returns a local CSS/JS path with a content-hash version, e.g.
 * `assets/css/Projects-Clean.css?v=ed22fddc`.
 *
 * The server tells browsers to keep CSS/JS for 30 days, so the address has
 * to change whenever the file does, or returning visitors combine old CSS
 * with new HTML. Same hash as tools/cache_bust.py (first 8 hex digits of
 * the MD5 of the file in public/), so running that script on dist/ is a no-op.
 */
export function v(path: string): string {
  let hash = versions.get(path);
  if (hash === undefined) {
    const file = join(process.cwd(), "public", path);
    hash = createHash("md5").update(readFileSync(file)).digest("hex").slice(0, 8);
    versions.set(path, hash);
  }
  return `${path}?v=${hash}`;
}
