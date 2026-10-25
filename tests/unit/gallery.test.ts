// The gallery's cover cards (src/lib/gallery.ts).
import { describe, expect, it } from "vitest";
import { cardSize, categorySlug, galleryCards } from "../../src/lib/gallery";

const photo = (n: number) => ({
  file: `assets/img/x/${n}.webp`,
  alt: `photo ${n}`,
});

describe("galleryCards()", () => {
  const cards = galleryCards({
    productions: [
      {
        title: "Macbeth",
        company: "Shadow Road",
        role: "Macduff",
        category: "Theatre",
        photos: [photo(1), photo(2)],
      },
    ],
    misc: [photo(3)],
    dance: [],
    certificates: [{ photos: [photo(4)] }, { photos: [photo(5)] }],
  });

  it("makes a card per show, then misc, dance and certificates (if any)", () => {
    expect(
      cards.map((c) => [c.key, c.title, c.category, c.photos.length]),
    ).toEqual([
      ["show-0", "Macbeth", "Theatre", 2],
      ["misc", "More productions", "Theatre", 1],
      ["certificates", "Stage combat certificates", "Stage combat", 2],
    ]);
  });

  it("captions a show's photos with its title and role", () => {
    expect(cards[0]!.caption).toBe("Macbeth – Macduff");
    expect(cards[0]!.company).toBe("Shadow Road");
  });
});

describe("layout helpers", () => {
  it("makes every 7th card big and the 5th of each run wide", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(cardSize)).toEqual([
      "big",
      "normal",
      "normal",
      "normal",
      "wide",
      "normal",
      "normal",
      "big",
    ]);
  });

  it("turns a category into the filter's address", () => {
    expect(categorySlug("Stage combat")).toBe("stage-combat");
    expect(categorySlug("Theatre")).toBe("theatre");
  });
});
