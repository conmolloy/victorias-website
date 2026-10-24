# Victoria Adler – actor website

Portfolio site for Victoria Adler: headshots, gallery, showreel, CV and
reviews. Built with [Astro](https://astro.build) (TypeScript, strict) into
plain static HTML/CSS/JS – no PHP, no server-side code. The build output
(`dist/`) is what gets uploaded.

Each page loads the same small stack:

- **Bootstrap 5.3** with the Start Bootstrap _Grayscale_ theme
  (`public/assets/bootstrap/`) – layout, navbar, mobile menu. The CSS is
  built from Bootstrap's Sass by `tools/bootstrap` (with Bootstrap 4's
  spacing, colours and grid behaviour, so the pages look as they did);
  pages load a **trimmed** `bootstrap.min.css` (17 KB, only the rules the
  site uses) – see [Trimmed CSS](#trimmed-css-bootstrap-and-icons).
- **No jQuery.** The scripts are TypeScript `<script>`s in the components,
  bundled by Astro into `/_astro/` (content-hashed file names): the navbar
  (`Navbar.astro`: Bootstrap's collapse plugin for the phone menu, shrinks
  after scrolling), smooth scrolling for in-page links (`BaseLayout.astro`)
  and the click-to-load videos (`gallery/VideoPreview.astro`)
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
- `assets/css/Projects-Clean.css` – the site's own styles. Home and
  reviews were designed with a smaller text size (14–15px instead of 16px):
  their `<body class="compact">` sets `--page-rem` to it, and the navbar,
  headings, review cards and contact section are sized in that unit there

## How to update the site

The gallery, headshots and reviews live in three plain text files in
`src/content/` – you never need to touch the HTML to add a show, photos, a
review or a video. Victoria can edit them in the browser with the
[editing screen](#the-editing-screen-admin); they can also be edited directly:

| File                         | What's in it                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/content/gallery.yaml`   | shows (photos, company, role), "Misc" and dance photos, voice reels, songs, videos, certificates |
| `src/content/headshots.yaml` | headshot shoots                                                                                  |
| `src/content/reviews.yaml`   | press reviews (and which ones the home page shows), archery coaching reviews                     |

### The editing screen (`/admin`)

**https://victoriaadler.co.uk/admin/** is a web page for editing the gallery,
headshots and reviews without the command line (it's
[Sveltia CMS](https://sveltiacms.app), on trial). It edits the same three
files: lists of shows, photos, shoots, reviews and videos you can add to,
reorder (drag) and change, with photo uploads.

- **Saving publishes.** Each save is a commit to `main`, which runs the
  checks and deploys as usual – the change is live about 2–3 minutes later
  (progress: the repo's **Actions** tab). If a save would break the site –
  e.g. a photo with no description – the checks stop the deploy, the live
  site stays as it was, and the problem shows in the Actions tab.
- **Photos** are converted to WebP and shrunk to 2000px in the browser before
  they're saved (into `src/assets/img/`), and the build makes the smaller
  versions phones use – just upload the JPG from the photographer.
- **Videos:** paste the normal Vimeo/YouTube address; the preview image is
  downloaded automatically when the site is built.
- **Recordings** are stored in `public/assets/audio/` (keep them under
  ~50 MB).
- The editor rewrites a whole file when it saves: the explanations
  (`# comments`) in the files disappear after the first save – this README
  and the hints in the editor cover the same ground.

#### Giving Victoria access

1. Victoria makes a free [GitHub](https://github.com/signup) account (with
   two-factor authentication on: Settings → Password and authentication).
2. Add her to the repository: **Settings → Collaborators → Add people**
   (role: Write). She accepts the email invitation.
3. She signs in at `/admin`:
   - **Sign In Using Access Token** (works now): the dialog's link opens
     GitHub with the right permissions ticked; choose _Only select
     repositories → victorias-website_, an expiry (up to a year), generate,
     copy, paste. The browser remembers it until it expires.
   - **Sign In with GitHub** (one click, nicer): needs a small free sign-in
     helper set up once – see below. Until then that button won't work.

Anyone who can edit can also break or delete things, so only add people you
trust; every change is in the Git history and can be undone.

#### Optional: one-click "Sign In with GitHub"

GitHub needs a tiny server to finish a sign-in for a static site. Sveltia's
[authenticator](https://github.com/sveltia/sveltia-cms-auth) runs on a free
Cloudflare Workers account:

1. Deploy it with the **Deploy to Cloudflare Workers** button in its README;
   note the Worker's address (`https://sveltia-cms-auth.<name>.workers.dev`).
2. Register a GitHub OAuth app at github.com/settings/applications/new –
   callback URL: `<Worker address>/callback` – and generate a client secret.
3. In the Worker's settings (Variables) set `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET` (encrypted) and `ALLOWED_DOMAINS` =
   `victoriaadler.co.uk`.
4. Un-comment `base_url:` in `public/admin/config.yml`, put the Worker
   address there, commit.

#### Trying it without touching the live site

Run `npm run dev`, open http://localhost:4321/admin/index.html (the dev server needs the
`index.html`) in Chrome or Edge and
choose **Work with Local Repository** (pick this repo's folder): edits are
written to your local files, nothing is committed or published, and the dev
server shows the result straight away.

#### Changing the editor

The fields are described in `public/admin/config.yml`; they must match
`src/content.config.ts` (a test checks that every field in the content files
is in the editor, so a save can't silently drop one). To update Sveltia,
change the pinned version in `public/admin/index.html`.

### Editing the files directly

They're [YAML](https://learnxinyminutes.com/docs/yaml/): one item per `-`,
**indentation matters** (use spaces, line things up like the entries around
them), and put text in `"quotes"` if it contains a `:` or starts with a
quote mark. Lists appear on the page in the order they're written.

**Every time**, after editing:

```bash
npm run dev
```

and check the page at http://localhost:4321 (it updates as you save). If
something's wrong – a misspelt field name, a missing alt text, a photo that
doesn't exist – the page shows an error saying which file and which entry
(entries are counted from 0: `productions.5` is the 6th show). When it looks
right, commit and push (or open a pull request) – pushing to `main` puts it
live.

### Add a show to the gallery

1. Put the photos in a new folder, e.g. `src/assets/img/hamlet/` (JPG or
   PNG is fine), then make them web-ready – this converts them to `.webp`
   (after step 2, so it can update the paths in the data file too):

   ```bash
   uv run --with pillow python tools/optimize_images.py --apply
   ```

   The smaller versions phones use are made by the build (see
   [Adding photos](#adding-photos)).

2. Add the show at the top of `productions:` in `src/content/gallery.yaml`
   (newest first; 3 photos fill a row):

   ```yaml
   productions:
     - title: Hamlet
       company: Shadow Road Productions
       role: Ophelia
       photos_by: Jane Smith # optional – shows "Photos by Jane Smith"
       photos:
         - file: assets/img/hamlet/1.webp
           alt: Victoria Adler as Ophelia in Hamlet
         - file: assets/img/hamlet/2.webp
           alt: Victoria Adler as Ophelia in Hamlet
         - file: assets/img/hamlet/3.webp
           alt: Victoria Adler and the company of Hamlet
   ```

   `alt` describes the photo for people who can't see it (and for Google).
   Misc and dance photos are the same `- file: … alt: …` pairs, under
   `misc:` / `dance:`.

### Add a headshot shoot

Photos as above (in e.g. `src/assets/img/headshot 2025/`, then the
command), then at the top of `shoots:` in `src/content/headshots.yaml`:

```yaml
shoots:
  - year: 2025 # a year heading is shown when it changes
    photographer: Jane Smith # shows "Photography by Jane Smith"
    columns: 3 # photos side by side on a computer: 2 or 3
    photos:
      - file: assets/img/headshot 2025/1.webp
        alt: Victoria Adler headshot by Jane Smith, 2025
      - file: assets/img/headshot 2025/2.webp
        alt: Victoria Adler headshot by Jane Smith, 2025
      - file: assets/img/headshot 2025/3.webp
        alt: Victoria Adler headshot by Jane Smith, 2025
```

The first shoot's photos load first (the top of the page), so put the best
one first.

### Add a review

In `src/content/reviews.yaml`, under `press:`, where you want it to appear:

```yaml
press:
  - quote:
      - '"A commanding Lady Macbeth."' # one line per paragraph
    by: Jane Smith # optional
    publication: The Stage
    date: 1st June 2025
    link: https://www.thestage.co.uk/reviews/macbeth
    production: Macbeth # for reference, not shown
    home: true # also show it on the home page
```

Use `<b>…</b>` around words to make them bold. A short quote next to a long
one can get `blank_lines: [2, 2]` (empty lines before/after) so the two
cards are the same height. The first review has a row to itself, then they
go two per row – on the home page too. Archery coaching reviews are a plain
list under `coaching:`.

### Add a video

1. Add it to a row under `video_rows:` in `src/content/gallery.yaml` – just
   the title and the normal Vimeo/YouTube address:

   ```yaml
   video_rows:
     - videos:
         - title: Stage combat showreel
           url: https://vimeo.com/123456789
         - title: Another video
           url: https://www.youtube.com/watch?v=abcdefghijk
   ```

   (each `- videos:` is a row; the videos under it are in that row.)

2. Download its preview image (the page shows the thumbnail and only loads
   the player when someone clicks it):

   ```bash
   uv run --with pillow python tools/video_facades.py --apply
   ```

### Add a recording

Put the `.mp3` (and, if you have one, an `.ogg`) in `public/assets/audio/…`
and add it under `voice_reels:` or `songs:`:

```yaml
songs:
  - title: Defying Gravity
    files:
      - assets/audio/2025/defying gravity.mp3
```

## Where things live

| Path                                                | What                                                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/*.astro`                                 | one file per page → `dist/<name>.html`                                                                                              |
| `src/content/*.yaml`                                | the gallery, headshots and reviews content – see [How to update the site](#how-to-update-the-site)                                  |
| `src/content.config.ts`                             | what those files may contain (checked when building)                                                                                |
| `src/assets/img/`                                   | gallery and headshot photos (the build makes their smaller versions)                                                                |
| `src/components/gallery/`, `headshots/`, `reviews/` | how a show, photo, recording, video, shoot or review card is laid out                                                               |
| `src/layouts/BaseLayout.astro`                      | shared `<head>` (meta, font preloads, stylesheets, Google Tag Manager), GTM noscript, navbar, smooth-scrolling script               |
| `src/components/Navbar.astro`                       | the navbar (page links and Spotlight/IMDb/Instagram logos are lists at the top)                                                     |
| `src/components/Contact.astro`                      | "Contact Me" section on the home page                                                                                               |
| `src/components/GoogleTagManager.astro`             | the deferred Google Tag Manager snippet                                                                                             |
| `src/lib/asset.ts`                                  | `v()` – adds the `?v=<hash>` to local CSS/JS links                                                                                  |
| `src/lib/photos.ts`, `media.ts`                     | photo sizes and `srcset` (`astro:assets`), video players and preview images, with clear errors for missing files                    |
| `public/`                                           | copied to the site as-is: `favicon.ico`, `assets/` (`css/`, `fonts/`, `bootstrap/`, `img/`, `audio/`, `video/`, `showreel/`, `cv/`) |
| `tests/`                                            | `unit/` (Vitest), `dist/` (checks on the build), `e2e/` (Playwright) – see [Checks and tests](#checks-and-tests)                    |
| `tools/`                                            | maintenance scripts (not deployed)                                                                                                  |

| Page               | File                       | Shows                                         |
| ------------------ | -------------------------- | --------------------------------------------- |
| `/` (`index.html`) | `src/pages/index.astro`    | Home – header video, about, reviews, contact  |
| `/headshot`        | `src/pages/headshot.astro` | Headshots                                     |
| `/gallery`         | `src/pages/gallery.astro`  | Production photos, audio clips and voicereels |
| `/showreel`        | `src/pages/showreel.astro` | Showreel video                                |
| `/resume`          | `src/pages/resume.astro`   | CV (PDF shown with PDF.js)                    |
| `/reviews`         | `src/pages/reviews.astro`  | Reviews                                       |

Per-page settings are props on `BaseLayout`: `title`, `description` and
`path` (see [Link previews and search](#link-previews-and-search)),
`preloads` (font files), `outfit` (extra stylesheet), `compact` (home and
reviews' smaller text size), `brandHref`, `bodyId`, `bodyClass`; extra `<head>` content goes in
`slot="head"` / `slot="head-scripts"`, extra end-of-body scripts in
`slot="scripts"` (see `resume.astro` and `gallery.astro`).

### Editing pages – Astro gotchas

Pages are mostly plain HTML, but:

- Every tag must be closed (`<div>` … `</div>`) – the build fails otherwise.
- `{` and `}` in text start an Astro expression; write `&#123;` / `&#125;`
  if you need them literally (inside quoted attributes they're fine).
- A plain `<script>` is TypeScript that Astro bundles (and includes once
  per page, however often the component is used) – that's how the site's
  scripts are written. `<style>` and scripts that must stay exactly as
  written (Google Tag Manager, the CV's PDF.js) need `is:inline`.
- Link local CSS files with `v()` – `<link rel="stylesheet" href={v("assets/css/x.css")}>`
  (also `<script is:inline src={v("assets/js/x.js")}>` for a script file in
  `public/`) – so the address changes when the file does (browsers keep
  CSS/JS for 30 days). Bundled scripts get a new file name by themselves.
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
  repo leaves the old copy on Cloudways. To remove such files, add their
  paths to `tools/server-cleanup/old-files.txt` and run **Clean up old files
  on the server** from the Actions tab
  ([`cleanup-server.yml`](.github/workflows/cleanup-server.yml)): first as it
  is (it only lists what it would delete), then with "Really delete" ticked.
  It only ever touches the listed paths under `assets/`.
- Only `dist/` is uploaded (`src/`, `tools/`, `*.md` etc. never reach the server).
- GitHub rejects files over 100 MB, so keep videos compressed (see below).
  Unused media listed in [`.gitignore`](.gitignore) isn't in the repo.

## Link previews and search

Each page's `<title>` and `description` (props on `BaseLayout` at the top of
`src/pages/*.astro`) are what Google shows in results, and – with the photo
below – what WhatsApp, iMessage, email, LinkedIn, Facebook and X show when
someone shares a link. Keep descriptions under ~160 characters and only say
things the site itself says.

- Shared links show `public/assets/img/share/victoria-adler.jpg` (1200×630
  JPEG). To change the photo or its framing, edit `SOURCE` / `TOP` /
  `BOTTOM` in `tools/make_share_image.py` and run
  `uv run --with pillow python tools/make_share_image.py`.
- The tags themselves are in `src/components/SeoTags.astro`; the home page
  also describes Victoria for search engines (`PersonSchema.astro`, using the
  profile links in `src/lib/site.ts`).
- Each page has one canonical address – the one without `.html`
  (`/gallery`) – and `sitemap.xml` (from `src/pages/sitemap.xml.ts`) lists
  them. **Adding a page:** add its path to `PAGES` in `src/lib/site.ts`
  (the build-output tests fail until you do).
- Apps cache previews: after changing them, re-check a link with
  Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/)
  or LinkedIn's [Post Inspector](https://www.linkedin.com/post-inspector/),
  which also refreshes their copy.

## Adding photos

Images are served as WebP. To add new ones:

1. Put the JPG/PNG in the right folder and reference it, using `/` not `\`:
   - **gallery and headshot photos**: in `src/assets/img/...`, listed in
     `src/content/gallery.yaml` / `headshots.yaml` as `assets/img/...` (see
     [How to update the site](#how-to-update-the-site))
   - **any other image** (logos, the home page photo, backgrounds): in
     `public/assets/img/...`, referenced in the page as `src="assets/img/..."`
2. Convert it – this resizes to max 2000px, writes a `.webp`, updates the
   page or data file to point at it, and moves the original to
   `_originals/` (local backup, not committed):

   ```bash
   uv run --with pillow python tools/optimize_images.py           # preview
   uv run --with pillow python tools/optimize_images.py --apply
   ```

   (Without `uv`: `pip install pillow`, then `python tools/optimize_images.py`.)

3. Commit and push.

**Gallery and headshot photos** get smaller versions automatically: the
build (`astro:assets`, in `src/lib/photos.ts`) makes 400, 800 and 1200px
wide `.webp` versions of each listed photo, so phones and laptops don't
download the 2000px file for a smaller space, and adds
`srcset`/`sizes`/`width`/`height`. They're written to `dist/_astro/` with a
content hash in the name (e.g. `/_astro/1.CSy1meUX_2jL6E.webp`), so a
replaced photo always gets a new address. The full-size photo is served as
it is. Making them adds a few seconds to a build (they're cached in
`node_modules/.astro/` after that); `npm run dev` makes them on demand.

Gallery and headshot photos lazy-load automatically, except the first show's
and the first shoot's (they're on the first screen); the first headshot also
loads first of all. For any other `<img>` you add to a page, add
`loading="lazy"` unless it's visible at the top of the page.

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
(111 KB → 17 KB and 30 KB → 1 KB). `tools/trim-css` opens each built page
(`dist/*.html`) in Chrome – phone/tablet/desktop, scrolled, with the mobile
menu open – and keeps every rule that matches something.

| Pages load (trimmed, generated)                 | Source (complete, edit this)                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `public/assets/bootstrap/css/bootstrap.min.css` | `public/assets/bootstrap/css/bootstrap.full.min.css` (built from `tools/bootstrap/grayscale.scss`) |
| `public/assets/fonts/font-awesome.min.css`      | `public/assets/fonts/font-awesome.full.min.css`                                                    |
| `public/assets/fonts/fontawesome-subset.woff2`  | `public/assets/fonts/fontawesome-webfont.woff2`                                                    |

**Changing Bootstrap's settings or the theme** (or updating Bootstrap):
edit `tools/bootstrap/grayscale.scss` (the `bootstrap` version in
`package.json` is used for both the CSS and the navbar's script), then

```bash
cd tools/bootstrap && npm install && npm run build
```

and re-trim as below.

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
player only loads when it's clicked (the script in
`src/components/gallery/VideoPreview.astro`), which
saves ~1 MB of player scripts per visit. Videos are listed in
`src/content/gallery.yaml` – see [Add a video](#add-a-video).

## Checking a change looks the same

`tools/visual-check/` has Puppeteer scripts that screenshot two copies of
the site (e.g. `main` and your build) and diff them pixel by pixel, plus
behaviour and returning-visitor checks – see its
[README](tools/visual-check/README.md).

## Plans

See [PLAN.md](PLAN.md).
