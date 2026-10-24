// Helpers that turn the YAML content files into page markup.
import { describe, expect, it } from "vitest";
import {
  audioFile,
  encodePath,
  videoPreview,
  webpSize,
} from "../../src/lib/media";
import { photo } from "../../src/lib/photos";
import { caption, reviewRows } from "../../src/lib/reviews";

describe("photo()", () => {
  it("reads the size and makes the smaller versions with astro:assets", async () => {
    // 1600px wide: 400, 800 and 1200px versions, then the photo itself
    const { src, srcset, width, height } = await photo(
      "assets/img/headshot 2024/q3/victoria-7646-3.webp",
    );
    expect({ width, height }).toEqual({ width: 1600, height: 2000 });
    const candidates = srcset.split(", ");
    expect(candidates.map((c) => c.split(" ")[1])).toEqual([
      "400w",
      "800w",
      "1200w",
      "1600w",
    ]);
    expect(candidates.at(-1)).toBe(`${src} 1600w`);
    // spaces in the folder name are encoded, so srcset stays valid
    expect(src).toContain("headshot%202024/q3/victoria-7646-3.webp");
    expect(srcset).not.toMatch(/headshot 2024/);
  });

  it("only makes versions smaller than the photo", async () => {
    // 1000px wide: only 400 and 800; 495px: only 400
    const certificate = await photo(
      "assets/img/certificates/d_and_r_merit.webp",
    );
    expect(certificate.srcset.split(", ").map((c) => c.split(" ")[1])).toEqual([
      "400w",
      "800w",
      "1000w",
    ]);
    const dance = await photo("assets/img/dance/1.webp");
    expect(dance.srcset.split(", ").map((c) => c.split(" ")[1])).toEqual([
      "400w",
      "495w",
    ]);
  });

  it("stops the build for a missing photo, saying where to look", async () => {
    await expect(photo("assets/img/macbeth/nope.webp")).rejects.toThrow(
      /Photo not found: src\/assets\/img\/macbeth\/nope\.webp/,
    );
  });
});

describe("webpSize()", () => {
  it("reads WebP sizes", () => {
    expect(
      webpSize("public/assets/img/video-thumbs/vimeo-573035467.webp"),
    ).toEqual({
      width: 960,
      height: 552,
    });
  });

  it("encodes addresses", () => {
    expect(encodePath("a b/{c}(d)'e!.webp")).toBe("a%20b/%7Bc%7D(d)'e!.webp");
  });
});

describe("videoPreview()", () => {
  it("uses the standard Vimeo player and permissions", () => {
    expect(
      videoPreview({
        title: "Flexibility",
        url: "https://vimeo.com/573045854",
      }),
    ).toEqual({
      title: "Flexibility",
      url: "https://vimeo.com/573045854",
      embed: "https://player.vimeo.com/video/573045854?autoplay=1",
      allow: "autoplay; fullscreen; picture-in-picture",
      thumbnail: {
        src: "assets/img/video-thumbs/vimeo-573045854.webp",
        width: 960,
        height: 540,
      },
    });
  });

  it("handles YouTube and lets the data file override the player", () => {
    const yt = videoPreview({
      title: "x",
      url: "https://www.youtube.com/watch?v=l03ONU8GYZ8",
    });
    expect(yt.embed).toBe(
      "https://www.youtube.com/embed/l03ONU8GYZ8?autoplay=1",
    );
    expect(yt.allow).toContain("encrypted-media");
    const custom = videoPreview({
      title: "x",
      url: "https://vimeo.com/983925079",
      player: "https://player.vimeo.com/video/983925079?badge=0&autoplay=1",
      allow: "autoplay",
    });
    expect(custom.embed).toBe(
      "https://player.vimeo.com/video/983925079?badge=0&autoplay=1",
    );
    expect(custom.allow).toBe("autoplay");
  });

  it("stops the build when a video has no preview image yet", () => {
    expect(() =>
      videoPreview({ title: "New", url: "https://vimeo.com/1" }),
    ).toThrow(/tools\/video_facades\.py/);
  });
});

describe("audioFile()", () => {
  it("gives the type and checks the file exists", () => {
    expect(
      audioFile("assets/audio/dec 2021/hallelujah/Hallelujah.ogg"),
    ).toEqual({
      src: "assets/audio/dec 2021/hallelujah/Hallelujah.ogg",
      type: "audio/ogg",
    });
    expect(() => audioFile("assets/audio/nope.mp3")).toThrow(
      /Audio file not found/,
    );
  });
});

describe("reviews", () => {
  it("builds the caption from who, where and when", () => {
    expect(
      caption({
        by: "Tim Wilcock",
        publication: "FringeReview",
        date: "9th August 2023",
      }),
    ).toBe("Tim Wilcock, FringeReview, 9th August 2023");
    expect(
      caption({ publication: "St Albans Times", date: "21st August 2024" }),
    ).toBe("St Albans Times, 21st August 2024");
  });

  it("puts the first review on its own row, then two per row", () => {
    expect(reviewRows([1, 2, 3, 4, 5])).toEqual([[1], [2, 3], [4, 5]]);
    expect(reviewRows([1, 2, 3, 4])).toEqual([[1], [2, 3], [4]]);
    expect(reviewRows([])).toEqual([]);
  });
});
