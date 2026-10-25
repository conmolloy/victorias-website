// The editing screen (public/admin/config.yml) must describe every field in
// the content files: the CMS rewrites a whole file when it saves, and a field
// it doesn't know about would be dropped from the file – silently.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface Field {
  name: string;
  widget?: string;
  field?: Field;
  fields?: Field[];
}

const config = parse(readFileSync("public/admin/config.yml", "utf8")) as {
  backend: { repo: string; branch: string };
  media_folder: string;
  public_folder: string;
  output: { omit_empty_optional_fields: boolean };
  collections: { files: { file: string; fields: Field[] }[] }[];
};
const files = config.collections.flatMap((c) => c.files);

/** paths of keys in `data` that the CMS fields don't cover */
function uncovered(data: unknown, fields: Field[], path: string): string[] {
  if (data === null || typeof data !== "object" || Array.isArray(data))
    return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const field = fields.find((f) => f.name === key);
    if (!field) {
      out.push(`${path}${key}`);
      continue;
    }
    const items = Array.isArray(value) ? value : [value];
    items.forEach((item, i) => {
      const at = `${path}${key}${Array.isArray(value) ? `[${i}]` : ""}.`;
      if (field.fields) out.push(...uncovered(item, field.fields, at));
      else if (field.field?.fields)
        out.push(...uncovered(item, field.field.fields, at));
    });
  }
  return out;
}

describe("editing screen config (public/admin/config.yml)", () => {
  it("edits the six content files, committing to main of this repo", () => {
    expect(files.map((f) => f.file).sort()).toEqual([
      "src/content/cv.yaml",
      "src/content/gallery.yaml",
      "src/content/headshots.yaml",
      "src/content/home.yaml",
      "src/content/reviews.yaml",
      "src/content/showreel.yaml",
    ]);
    expect(config.backend).toMatchObject({
      repo: "conmolloy/victorias-website",
      branch: "main",
    });
  });

  it.each(files.map((f) => [f.file, f.fields] as const))(
    "has a field for everything in %s",
    (file, fields) => {
      const data = parse(readFileSync(file, "utf8"));
      expect(uncovered(data, fields, "")).toEqual([]);
    },
  );

  it("notices a field the config doesn't have (this test's own check)", () => {
    const fields: Field[] = [
      { name: "a" },
      { name: "b", fields: [{ name: "c" }] },
    ];
    expect(uncovered({ a: 1, b: [{ c: 1, d: 2 }] }, fields, "")).toEqual([
      "b[0].d",
    ]);
  });

  it("stores photos where the build looks for them, and leaves empty fields out", () => {
    // values are written as "/assets/img/…" (the slash lets the editor find
    // the file); the content schema reads them as "assets/img/…" for photos.ts
    expect(config.media_folder).toBe("src/assets/img");
    expect(config.public_folder).toBe("/assets/img");
    expect(config.output.omit_empty_optional_fields).toBe(true);
  });

  it("only takes PDFs for the CV, stored where the page serves them", () => {
    const cv = files.find((f) => f.file === "src/content/cv.yaml")!;
    const file = cv.fields.find((f) => f.name === "file") as Field & {
      accept: string;
      media_folder: string;
      public_folder: string;
    };
    expect(file.widget).toBe("file");
    expect(file.accept).toContain("application/pdf");
    expect(file.media_folder).toBe("/public/assets/cv");
    expect(file.public_folder).toBe("/assets/cv");
  });

  it("uploads files served as they are to public/, not next to the content file", () => {
    // a field's media_folder without a leading "/" is relative to the
    // content file: uploads would land in src/content/public/… and never
    // reach the site
    const folders: string[] = [];
    JSON.stringify(config, (key, value) => {
      if (key === "media_folder" && typeof value === "string")
        folders.push(value);
      return value;
    });
    const fieldFolders = folders.filter((f) => f !== config.media_folder);
    expect(fieldFolders.length).toBeGreaterThanOrEqual(3); // home photo, audio, CV
    for (const folder of fieldFolders) expect(folder).toMatch(/^\/public\//);
  });
});
