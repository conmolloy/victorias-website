# Victoria Adler – actor website

Portfolio site for Victoria Adler: headshots, gallery, showreel, CV and
reviews. Built with [Astro](https://astro.build) (TypeScript, strict) into
plain static HTML/CSS/JS – no PHP, no server-side code. The build output
(`dist/`) is what gets uploaded.

Each page loads the same small stack:

- **Bootstrap 4.6** with the Start Bootstrap _Grayscale_ theme
  (`public/assets/bootstrap/`) – layout, navbar, mobile menu. Pages load a
  **trimmed** `bootstrap.min.css` (11 KB, only the rules the site uses);
  the complete theme is `bootstrap.full.min.css` – see
  [Trimmed CSS](#trimmed-css-bootstrap-and-icons).
- **jQuery 3.5** (needed by Bootstrap 4's JS) + `assets/js/grayscale.js`
  (smooth scrolling, navbar shrink on scroll) – loaded at the end of `<body>`
- **Font Awesome 4.7** icons, also trimmed: `assets/fonts/font-awesome.min.css`
  - `fontawesome-subset.woff2` contain only the icons in use (menu, phone,
    envelope, arrow-down)
- **Fonts, self-hosted** (no Google Fonts requests): Lora + Cabin via
  `assets/css/fonts.css` and Roboto (`font-roboto.css`) on every page, Outfit
  (`font-outfit.css`) on home. Files are in `public/assets/fonts/` (latin +
  latin-ext subsets, `font-display: swap`). Each page `<link rel="preload">`s
  the fonts its first screen uses (the `preloads` prop, see below). To add a
  font, download it from Google Fonts (or google-webfonts-helper) as woff2
  rather than linking `fonts.googleapis.com`.
- **Google Tag Manager** (`GTM-NXB648G` – Google Analytics `G-WXKX3EMGL2` +
  Google Ads tags) is loaded _after_ the page: on the first
  scroll/tap/click/key, 3 s after load, or when the tab is switched away.
  It used to block the page for ~350 ms on every visit. Trade-off: a visitor
  who leaves within ~3 s without touching the page isn't counted. The
  snippet is `src/components/GoogleTagManager.astro`; change `3000` to adjust
  (then update the hash in `tests/unit/layout.test.ts`, which guards against
  accidental edits).
- `assets/css/Projects-Clean.css` – the site's own styles
- `assets/css/site-base.css` – **home and reviews only**: the base typography,
  buttons and header-video layout those two pages were designed with
  (originally from Materialize, which has been removed)

## Where things live

| Path                                    | What                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/*.astro`                     | one file per page → `dist/<name>.html`                                                                                                     |
| `src/layouts/BaseLayout.astro`          | shared `<head>` (meta, font preloads, stylesheets, Google Tag Manager), GTM noscript, navbar, end-of-body scripts                          |
| `src/components/Navbar.astro`           | the navbar (page links and Spotlight/IMDb/Instagram logos are lists at the top)                                                            |
| `src/components/Contact.astro`          | "Contact Me" section on the home page                                                                                                      |
| `src/components/GoogleTagManager.astro` | the deferred Google Tag Manager snippet                                                                                                    |
| `src/lib/asset.ts`                      | `v()` – adds the `?v=<hash>` to local CSS/JS links                                                                                         |
| `public/`                               | copied to the site as-is: `favicon.ico`, `assets/` (`css/`, `js/`, `fonts/`, `bootstrap/`, `img/`, `audio/`, `video/`, `showreel/`, `cv/`) |
| `tests/`                                | `unit/` (Vitest), `dist/` (checks on the build), `e2e/` (Playwright) – see [Checks and tests](#checks-and-tests)                           |
| `tools/`                                | maintenance scripts (not deployed)                                                                                                         |

| Page               | File                       | Shows                                         |
| ------------------ | -------------------------- | --------------------------------------------- |
| `/` (`index.html`) | `src/pages/index.astro`    | Home – header video, about, reviews, contact  |
| `/headshot`        | `src/pages/headshot.astro` | Headshots                                     |
| `/gallery`         | `src/pages/gallery.astro`  | Production photos, audio clips and voicereels |
| `/showreel`        | `src/pages/showreel.astro` | Showreel video                                |
| `/resume`          | `src/pages/resume.astro`   | CV (PDF shown with PDF.js)                    |
| `/reviews`         | `src/pages/reviews.astro`  | Reviews                                       |

Per-page differences are props on `BaseLayout`: `title`, `lang`, `favicon`,
`preloads` (font files), `outfit` / `siteBase` (extra stylesheets),
`brandHref`, `bodyId`, `bodyStyle`; extra `<head>` content goes in
`slot="head"` / `slot="head-scripts"`, extra end-of-body scripts in
`slot="scripts"` (see `resume.astro` and `gallery.astro`).

### Editing pages – Astro gotchas

Pages are mostly plain HTML, but:

- Every tag must be closed (`<div>` … `</div>`) – the build fails otherwise.
- `{` and `}` in text start an Astro expression; write `&#123;` / `&#125;`
  if you need them literally (inside quoted attributes they're fine).
- `<script>` and `<style>` need `is:inline`, or Astro bundles/scopes them.
- Link local CSS/JS with `v()` – `<link rel="stylesheet" href={v("assets/css/x.css")}>`,
  `<script is:inline src={v("assets/js/x.js")}></script>` – so the address
  changes when the file does (browsers keep CSS/JS for 30 days).
- Asset paths stay relative (`assets/img/...`, no leading `/`), as before.
- HTML comments placed directly after a component (e.g. after `<Contact />`)
  are dropped from the output.

## Working on it locally

Needs Node.js 24 (`.nvmrc`; 22.23+ works). Open the folder in VS Code and
install the recommended extensions it suggests (Astro, Prettier, ESLint,
Stylelint, Vitest, Playwright) – files are then formatted on save.

```bash
npm install
```

```bash
npm run dev
```

then visit http://localhost:4321 – pages reload as you edit. To build the
site exactly as it's deployed (type-check + `dist/`):

```bash
npm run build
```

```bash
npm run preview
```

(or `python -m http.server 8000 --directory dist`).

## Checks and tests

Every pull request runs all of these in GitHub Actions
([`ci.yml`](.github/workflows/ci.yml)); a PR should be green before merging.
To run the lot locally (as CI does):

```bash
npm run verify
```

| Command                                   | What it does                                                                                                                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format` / `npm run format:check` | [Prettier](https://prettier.io) (with the Astro plugin) formats / checks every file, except vendor files in `public/` (`.prettierignore`)                                                                                                         |
| `npm run lint` / `npm run lint:fix`       | [ESLint](https://eslint.org) (JS/TS, Astro components, accessibility) and [Stylelint](https://stylelint.io) (CSS)                                                                                                                                 |
| `npm run check`                           | `astro check`: TypeScript and Astro type errors (also part of `npm run build`)                                                                                                                                                                    |
| `npm test` (`npm run test:watch`)         | unit tests ([Vitest](https://vitest.dev)): `v()`, and the layout/navbar rendered with Astro's Container API                                                                                                                                       |
| `npm run test:dist`                       | after a build: every file a page uses exists in `dist/` with the exact upper/lower case, every CSS/JS link has the right `?v=`, every nav link has a page                                                                                         |
| `npm run test:e2e`                        | after a build: [Playwright](https://playwright.dev) opens the built site in Chrome at desktop and phone width – no errors, menu, navbar shrink, nav links, gallery scrolling and video previews, CV PDF, Google Tag Manager waits for the visitor |

Notes:

- The accessibility linter fails the checks on a photo without `alt` text
  (describe it, or `alt=""` if it's only decoration), a link or button
  with no text, or audio/video without captions. Recordings that can't
  have captions (songs, the reels, until there's a transcript) turn the
  caption rule off for that one element, with a comment saying why.
- Playwright uses your installed Google Chrome. If it says Chrome isn't
  found, install Chrome, or run `npx playwright install chromium` and remove
  `channel: "chrome"` from `playwright.config.ts`.
- `git blame` hides the big formatting commits if you run once:
  `git config blame.ignoreRevsFile .git-blame-ignore-revs`
- [Dependabot](.github/dependabot.yml) opens one pull request a month with
  dependency updates; merge it when CI is green.
- For pixel-by-pixel comparisons with the live site, see `tools/visual-check/`.

> The live server runs Linux, so file names are **case-sensitive**:
> `photo.JPG` and `photo.jpg` are different files there, even though Windows
> treats them as the same. Make sure paths in the pages match the file exactly.

> Local-only media (unused audio/video listed in [`.gitignore`](.gitignore))
> now belongs under `public/assets/...` – if you have copies in an old
> top-level `assets/` folder, move them there.

## Deploying

Pushing to `main` deploys automatically. GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) installs
Node, runs `npm ci` and `npm run build`, re-checks the CSS/JS versions in
the built HTML (`tools/cache_bust.py dist`), runs the unit and build-output
tests, and copies `dist/` to Cloudways over SSH with `rsync` (a failing test
stops the upload). Progress shows under the repo's **Actions** tab, and
there's a **Run workflow** button to redeploy manually. The full checks run on
every pull request ([`ci.yml`](.github/workflows/ci.yml)) – nothing is
uploaded from there.

It uses four repository secrets (Settings → Secrets and variables → Actions):
`CLOUDWAYS_HOST`, `CLOUDWAYS_USER`, `CLOUDWAYS_PATH` (`public_html`) and
`CLOUDWAYS_SSH_KEY`. These are the Cloudways **application** credentials.

Notes:

- The deploy **never deletes** files on the server. Removing a file from the
  repo leaves the old copy on Cloudways; delete it over SFTP if needed.
- Only `dist/` is uploaded (`src/`, `tools/`, `*.md` etc. never reach the server).
- GitHub rejects files over 100 MB, so keep videos compressed (see below).
  Unused media listed in [`.gitignore`](.gitignore) isn't in the repo.

## Adding photos

Images are served as WebP. To add new ones:

1. Put the JPG/PNG in the right `public/assets/img/...` folder and reference
   it in the page as usual (`src="assets/img/..."`, use `/` not `\`).
2. Convert it – this resizes to max 2000px, writes a `.webp`, updates the
   page (any `.astro` file in `src/`) to point at it, and moves the original
   to `_originals/` (local backup, not committed):

   ```bash
   uv run --with pillow python tools/optimize_images.py           # preview
   uv run --with pillow python tools/optimize_images.py --apply
   ```

   (Without `uv`: `pip install pillow`, then `python tools/optimize_images.py`.)

3. **Gallery and headshot photos** (`<img class="... zoom">` in
   `src/pages/gallery.astro`, `<img class="... zoom-hs">` in
   `src/pages/headshot.astro`): make the smaller versions so phones/laptops
   don't download the 2000px file for a smaller photo. This writes `-400w`,
   `-800w` and `-1200w` `.webp` files next to each new photo and adds
   `srcset`/`sizes`:

   ```bash
   uv run --with pillow python tools/make_thumbnails.py --apply
   ```

   Run it after step 2 (it uses the full-quality original in `_originals/`).
   If you later replace a gallery photo with a new file, delete its
   `srcset`/`sizes`/`width`/`height` attributes first so it's regenerated.

4. Commit and push.

Add `loading="lazy"` to `<img>` tags that **aren't** visible at the top of
the page – but not to photos on the first screen, or they'll appear late.
The page's most important first-screen photo can also get
`fetchpriority="high"` (e.g. the first headshot).

## Adding or replacing videos

Export as **H.264** MP4, not HEVC/H.265 – HEVC doesn't play in Firefox or in
Chrome on many PCs. In HandBrake, the "Fast 1080p30" preset works; or with
ffmpeg:

```bash
ffmpeg -i input.mov -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart output.mp4
```

For a muted background video use `-crf 28 -an` instead (no audio track).
Keep files well under 100 MB.

## Trimmed CSS (Bootstrap and icons)

Every page has to download its CSS before it can show anything, so the
Bootstrap theme and Font Awesome are trimmed to the rules the pages use
(159 KB → 11 KB and 30 KB → 1 KB). `tools/trim-css` opens each built page
(`dist/*.html`) in Chrome – phone/tablet/desktop, scrolled, with the mobile
menu open – and keeps every rule that matches something.

| Pages load (trimmed, generated)                 | Source (complete, edit this)                         |
| ----------------------------------------------- | ---------------------------------------------------- |
| `public/assets/bootstrap/css/bootstrap.min.css` | `public/assets/bootstrap/css/bootstrap.full.min.css` |
| `public/assets/fonts/font-awesome.min.css`      | `public/assets/fonts/font-awesome.full.min.css`      |
| `public/assets/fonts/fontawesome-subset.woff2`  | `public/assets/fonts/fontawesome-webfont.woff2`      |

**Added a Bootstrap component, a new page, or a new icon** (e.g.
`<i class="fa fa-star">`) and it looks unstyled or the icon is blank?
Re-generate the trimmed files (needs Chrome):

```bash
npm run build && cd tools/trim-css && npm install && npm run trim
```

and, for icons, then from the repo root:

```bash
uv run --with fonttools --with brotli python tools/subset_icons.py
```

then `npm run build` again. New pages are picked up automatically (every
`.html` in `dist/`). Quick fallback without the tools: link
`bootstrap.full.min.css` / `font-awesome.full.min.css` in
`BaseLayout.astro` instead (slower, but complete – icons still need the
subset re-run or the full font).

## Adding a Vimeo/YouTube video to the gallery

The gallery shows each video as a thumbnail with a play button; the real
player only loads when it's clicked (`assets/js/video-facade.js`), which
saves ~1 MB of player scripts per visit. To add one:

1. Copy the normal embed code from Vimeo/YouTube (Share → Embed) and paste
   it into `src/pages/gallery.astro` where you want it, inside a
   `<div class="col s12 m6 l6 video-containers">` like the others. Close the
   tag as `<iframe ...></iframe>` (Astro needs every tag closed).
2. Convert it to a click-to-load preview (downloads the thumbnail into
   `public/assets/img/video-thumbs/`):

   ```bash
   uv run --with pillow python tools/video_facades.py --apply
   ```

3. Commit and push.

## Checking a change looks the same

`tools/visual-check/` has Puppeteer scripts that screenshot two copies of
the site (e.g. `main` and your build) and diff them pixel by pixel, plus
behaviour and returning-visitor checks – see its
[README](tools/visual-check/README.md).

## Plans

See [PLAN.md](PLAN.md).
