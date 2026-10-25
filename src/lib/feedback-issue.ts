/**
 * The GitHub issue that feedback mode (src/scripts/feedback.ts) files for a
 * comment on the live site: a short title and a Markdown body saying what
 * Victoria asked for and exactly which part of which page she pointed at.
 * No browser APIs here, so it's unit-tested (tests/unit/feedback-issue.test.ts).
 */

export interface PickedElement {
  /** tag name, lower case, e.g. "img" */
  tag: string;
  /** short CSS path, e.g. "section#about > div.row > img.headshot" */
  selector: string;
  /** the element's text, if any (shortened) */
  text?: string | undefined;
  /** images: the file name and its description */
  image?: { file: string; alt: string } | undefined;
}

export interface Feedback {
  comment: string;
  page: { title: string; url: string };
  /** where on the page, e.g. ["Gallery", "Acting", "Treasure Island"] */
  where: string[];
  element: PickedElement;
  screen: { width: number; height: number; phone: boolean };
  date: Date;
}

export const LABEL = "site-feedback";
const TITLE_LENGTH = 60;

/** one line, at most `max` characters (with "…" when cut) */
export function shorten(text: string, max: number): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max - 1).trimEnd()}…`;
}

/** Markdown inline code that can't be broken by backticks in `text` */
const code = (text: string) => {
  const fence = text.includes("`") ? "``" : "`";
  return `${fence}${text}${fence}`;
};

export function buildIssue(feedback: Feedback): {
  title: string;
  body: string;
  labels: string[];
} {
  const { comment, page, where, element, screen, date } = feedback;
  const lines = [
    comment.trim(),
    "",
    "---",
    "",
    `**Page:** [${page.title}](${page.url})`,
    `**Where:** ${where.length ? where.join(" › ") : "(top of the page)"}`,
    `**Element:** ${code(element.tag)} – ${code(element.selector)}`,
  ];
  if (element.image)
    lines.push(
      `**Image:** ${code(element.image.file)} – “${element.image.alt || "(no description)"}”`,
    );
  if (element.text) lines.push(`**Text:** “${shorten(element.text, 200)}”`);
  lines.push(
    `**Screen:** ${screen.width}×${screen.height} (${screen.phone ? "phone" : "desktop"})`,
    `**Sent:** ${date.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    "_Sent from feedback mode on the site. A screenshot can be added to this issue on GitHub._",
  );
  return {
    title: `Feedback: ${shorten(comment, TITLE_LENGTH)}`,
    body: lines.join("\n"),
    labels: [LABEL],
  };
}
