// Helpers that turn the YAML content files into page markup.
import { describe, expect, it } from "vitest";
import { audioFile, videoPreview } from "../../src/lib/media";
import { encodePath, photo, webpSize } from "../../src/lib/photos";
import { caption, reviewRows } from "../../src/lib/reviews";

describe("photo()", () => {
  it("reads the size and lists the smaller versions that exist", () => {
    // 958px wide: only the 400w and 800w versions are smaller
    expect(photo("assets/img/macbeth/2.webp")).toEqual({
      src: "assets/img/macbeth/2.webp",
      srcset:
        "assets/img/macbeth/2-400w.webp 400w, assets/img/macbeth/2-800w.webp 800w, assets/img/macbeth/2.webp 958w",
      width: 958,
      height: 1436,
    });
  });

  it("encodes spaces in addresses", () => {
    const { src, srcset } = photo(
      "assets/img/headshot 2024/q3/victoria-7646-3.webp",
    );
    expect(src).toBe("assets/img/headshot%202024/q3/victoria-7646-3.webp");
    expect(srcset).toContain(
      "assets/img/headshot%202024/q3/victoria-7646-3-1200w.webp 1200w",
    );
    expect(encodePath("a b/{c}(d)'e!.webp")).toBe("a%20b/%7Bc%7D(d)'e!.webp");
  });

  it("stops the build for a missing photo, saying where to look", () => {
    expect(() => photo("assets/img/macbeth/nope.webp")).toThrow(
      /Photo not found: public\/assets\/img\/macbeth\/nope\.webp/,
    );
  });

  it("stops the build for a missing smaller version, saying how to make it", () => {
    // video thumbnails (960px) have no -400w/-800w versions
    expect(() => photo("assets/img/video-thumbs/vimeo-573045854.webp")).toThrow(
      /tools\/make_thumbnails\.py/,
    );
  });

  it("reads WebP sizes", () => {
    expect(
      webpSize("public/assets/img/video-thumbs/vimeo-573035467.webp"),
    ).toEqual({
      width: 960,
      height: 552,
    });
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
