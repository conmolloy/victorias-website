// The GitHub issue feedback mode files (src/lib/feedback-issue.ts).
import { describe, expect, it } from "vitest";
import {
  buildIssue,
  shorten,
  type Feedback,
} from "../../src/lib/feedback-issue";

const feedback: Feedback = {
  comment:
    "  Please make this photo bigger, it's my favourite one from the run  ",
  page: {
    title: "Gallery – Victoria Adler",
    url: "https://victoriaadler.co.uk/gallery",
  },
  where: ["Gallery", "Acting", "Treasure Island"],
  element: {
    tag: "img",
    selector: "div.row.projects > div.col > a.lightbox-link > img.img-fluid",
    image: {
      file: "IMG_6579.DGPdLYO9.webp",
      alt: "Victoria Adler as Doctor Livesey",
    },
  },
  screen: { width: 390, height: 844, phone: true },
  date: new Date("2026-10-25T09:30:00Z"),
};

describe("buildIssue()", () => {
  const issue = buildIssue(feedback);

  it("titles it with the start of the comment, labelled site-feedback", () => {
    expect(issue.title).toBe(
      "Feedback: Please make this photo bigger, it's my favourite one from t…",
    );
    expect(issue.title.length).toBeLessThanOrEqual("Feedback: ".length + 60);
    expect(issue.labels).toEqual(["site-feedback"]);
  });

  it("says what, where and on which screen", () => {
    expect(issue.body).toBe(
      [
        "Please make this photo bigger, it's my favourite one from the run",
        "",
        "---",
        "",
        "**Page:** [Gallery – Victoria Adler](https://victoriaadler.co.uk/gallery)",
        "**Where:** Gallery › Acting › Treasure Island",
        "**Element:** `img` – `div.row.projects > div.col > a.lightbox-link > img.img-fluid`",
        "**Image:** `IMG_6579.DGPdLYO9.webp` – “Victoria Adler as Doctor Livesey”",
        "**Screen:** 390×844 (phone)",
        "**Sent:** 2026-10-25 09:30 UTC",
        "",
        "_Sent from feedback mode on the site. A screenshot can be added to this issue on GitHub._",
      ].join("\n"),
    );
  });

  it("includes the element's text, shortened, when it has some", () => {
    const { body } = buildIssue({
      ...feedback,
      where: [],
      element: {
        tag: "p",
        selector: "p.descriptiontwo",
        text: "x".repeat(300),
      },
      screen: { width: 1366, height: 768, phone: false },
    });
    expect(body).toContain("**Where:** (top of the page)");
    expect(body).toContain(`**Text:** “${"x".repeat(199)}…”`);
    expect(body).toContain("(desktop)");
    expect(body).not.toContain("**Image:**");
  });
});

describe("shorten()", () => {
  it("joins lines and cuts at the limit", () => {
    expect(shorten("a\n  b   c", 10)).toBe("a b c");
    expect(shorten("abcdefghij", 5)).toBe("abcd…");
  });
});
