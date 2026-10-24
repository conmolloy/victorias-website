/**
 * The site's content, kept in plain YAML files in src/content/ so it can be
 * updated without touching any HTML:
 *   gallery.yaml    shows, misc/dance photos, audio, videos, certificates
 *   headshots.yaml  headshot shoots
 *   reviews.yaml    press reviews (some also on the home page), coaching reviews
 *
 * Each file is checked against the schema below when the site is built, so
 * a typo (a misspelt field name, a missing alt text or credit, a wrong
 * number) stops `npm run build` with a message saying which file and field.
 * Each file is one entry, so the lists keep the order they're written in.
 */
import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";
import { parse } from "yaml";

/** A whole YAML file as a single entry (Astro doesn't keep entry order). */
const yamlFile = (name: string) =>
  file(`src/content/${name}.yaml`, {
    parser: (text) => [{ id: name, ...parse(text) }],
  });

const text = z.string().trim().min(1);

/** A photo in src/, e.g. assets/img/macbeth/1.webp, with its alt text. */
const photo = z
  .object({
    file: text.regex(/^assets\/.+\.webp$/, {
      message:
        'Photos must be .webp files under src/assets/, e.g. "assets/img/show/1.webp" ' +
        "(convert a .jpg/.png with: uv run --with pillow python tools/optimize_images.py --apply)",
    }),
    alt: text,
  })
  .strict();

const audioClip = z
  .object({
    title: text,
    /** .mp3 (and optionally .ogg) files under public/assets/ */
    files: z.array(text.regex(/^assets\/.+\.(mp3|ogg)$/)).min(1),
  })
  .strict();

const video = z
  .object({
    title: text,
    /** the normal Vimeo or YouTube address of the video */
    url: z.url().regex(/vimeo\.com\/\d+|youtube\.com\/watch\?v=|youtu\.be\//, {
      message: "Only Vimeo and YouTube videos are supported",
    }),
    /** optional: a different player address than the standard one */
    player: z.url().optional(),
    /** optional: the player's "allow" permissions, if not the standard ones */
    allow: text.optional(),
  })
  .strict();

const gallery = defineCollection({
  loader: yamlFile("gallery"),
  schema: z
    .object({
      id: z.string(), // added by yamlFile()
      productions: z
        .array(
          z
            .object({
              title: text,
              company: text,
              role: text,
              photos_by: text.optional(),
              photos: z.array(photo).min(1),
            })
            .strict(),
        )
        .min(1),
      misc: z.array(photo),
      dance: z.array(photo),
      voice_reels: z.array(audioClip),
      songs: z.array(audioClip),
      video_rows: z.array(z.array(video).min(1)),
      certificates: z.array(z.array(photo)),
    })
    .strict(),
});

const headshots = defineCollection({
  loader: yamlFile("headshots"),
  schema: z
    .object({
      id: z.string(), // added by yamlFile()
      shoots: z
        .array(
          z
            .object({
              year: z.number().int().min(2000).max(2100),
              photographer: text,
              /** photos side by side on a desktop screen */
              columns: z.union([z.literal(2), z.literal(3)]),
              /** photos stacked in each column (listed column by column) */
              stack: z.number().int().min(1).default(1),
              photos: z.array(photo).min(1),
            })
            .strict(),
        )
        .min(1),
    })
    .strict(),
});

const reviews = defineCollection({
  loader: yamlFile("reviews"),
  schema: z
    .object({
      id: z.string(), // added by yamlFile()
      press: z.array(
        z
          .object({
            quote: z.array(text).min(1),
            blank_lines: z
              .tuple([z.number().int().min(0), z.number().int().min(0)])
              .optional(),
            by: text.optional(),
            publication: text,
            date: text,
            link: z.url(),
            production: text.optional(),
            home: z.boolean().default(false),
          })
          .strict(),
      ),
      coaching_heading: text,
      coaching: z.array(text),
    })
    .strict(),
});

export const collections = { gallery, headshots, reviews };
