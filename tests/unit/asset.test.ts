import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { v } from "../../src/lib/asset";

const md5 = (path: string) =>
  createHash("md5")
    .update(readFileSync(`public/${path}`))
    .digest("hex")
    .slice(0, 8);

describe("v() cache-busting", () => {
  it("adds the first 8 hex digits of the file's MD5 (same as tools/cache_bust.py)", () => {
    const path = "assets/css/Projects-Clean.css";
    expect(v(path)).toBe(`${path}?v=${md5(path)}`);
  });

  it("works for scripts too", () => {
    expect(v("assets/js/grayscale.js")).toMatch(
      /^assets\/js\/grayscale\.js\?v=[0-9a-f]{8}$/,
    );
  });

  it("fails the build for a file that doesn't exist (typo in a link)", () => {
    expect(() => v("assets/css/does-not-exist.css")).toThrow(/ENOENT/);
  });
});
