# Victoria Adler – actor website

Portfolio site for Victoria Adler: headshots, gallery, showreel, CV and
reviews. Plain static HTML/CSS/JS – no build step, no PHP.

Each page loads the same small stack:

- **Bootstrap 4.6** with the Start Bootstrap *Grayscale* theme
  (`assets/bootstrap/`) – layout, navbar, mobile menu. Pages load a
  **trimmed** `bootstrap.min.css` (11 KB, only the rules the site uses);
  the complete theme is `bootstrap.full.min.css` – see
  [Trimmed CSS](#trimmed-css-bootstrap-and-icons).
- **jQuery 3.5** (needed by Bootstrap 4's JS) + `assets/js/grayscale.js`
  (smooth scrolling, navbar shrink on scroll) – loaded at the end of `<body>`
- **Font Awesome 4.7** icons, also trimmed: `assets/fonts/font-awesome.min.css`
  + `fontawesome-subset.woff2` contain only the icons in use (menu, phone,
  envelope, arrow-down)
- **Fonts, self-hosted** (no Google Fonts requests): Lora + Cabin via
  `assets/css/fonts.css` on every page, Roboto (`font-roboto.css`) on all
  pages except home, Outfit (`font-outfit.css`) on home. Files are in
  `assets/fonts/` (latin + latin-ext subsets, `font-display: swap`). Each
  page `<link rel="preload">`s the fonts its first screen uses. To add a
  font, download it from Google Fonts (or google-webfonts-helper) as woff2
  rather than linking `fonts.googleapis.com`.
- `assets/css/Projects-Clean.css` – the site's own styles
- `assets/css/site-base.css` – **home and reviews only**: the base typography,
  buttons and header-video layout those two pages were designed with
  (originally from Materialize, which has been removed)

## Pages

| File | Page |
|---|---|
| `index.html` | Home – header video, about, current shows, contact |
| `headshot.html` | Headshots |
| `gallery.html` | Production photos, audio clips and voicereels |
| `showreel.html` | Showreel video |
| `resume.html` | CV |
| `reviews.html` | Reviews |

Assets live in `assets/` (`css/`, `js/`, `fonts/`, `bootstrap/`, `img/`,
`audio/`, `video/`, `showreel/`, `cv/`).

## Working on it locally

Open the folder in VS Code and serve it, e.g.:

```bash
python -m http.server 8000
```

then visit http://localhost:8000.

> The live server runs Linux, so file names are **case-sensitive**:
> `photo.JPG` and `photo.jpg` are different files there, even though Windows
> treats them as the same. Make sure paths in the HTML match the file exactly.

## Deploying

Pushing to `main` deploys automatically. GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) copies the
site to Cloudways over SSH with `rsync`. Progress shows under the repo's
**Actions** tab, and there's a **Run workflow** button to redeploy manually.

It uses four repository secrets (Settings → Secrets and variables → Actions):
`CLOUDWAYS_HOST`, `CLOUDWAYS_USER`, `CLOUDWAYS_PATH` (`public_html`) and
`CLOUDWAYS_SSH_KEY`. These are the Cloudways **application** credentials.

Notes:

- The deploy **never deletes** files on the server. Removing a file from the
  repo leaves the old copy on Cloudways; delete it over SFTP if needed.
- `*.md`, `tools/`, `.github/` and other dev files are not uploaded.
- GitHub rejects files over 100 MB, so keep videos compressed (see below).
  Unused media listed in [`.gitignore`](.gitignore) isn't in the repo.

## Adding photos

Images are served as WebP. To add new ones:

1. Put the JPG/PNG in the right `assets/img/...` folder and reference it in
   the page as usual (use `/` in paths, not `\`).
2. Convert it – this resizes to max 2000px, writes a `.webp`, updates the
   page to point at it, and moves the original to `_originals/`
   (local backup, not committed):

   ```bash
   uv run --with pillow python tools/optimize_images.py           # preview
   uv run --with pillow python tools/optimize_images.py --apply
   ```

   (Without `uv`: `pip install pillow`, then `python tools/optimize_images.py`.)
3. **Gallery and headshot photos** (`<img class="... zoom">` in
   `gallery.html`, `<img class="... zoom-hs">` in `headshot.html`): make the
   smaller versions so phones/laptops don't download the 2000px file for a
   smaller photo. This writes `-400w`, `-800w` and `-1200w`
   `.webp` files next to each new photo and adds `srcset`/`sizes`:

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
(159 KB → 11 KB and 30 KB → 1 KB). `tools/trim-css` opens each page in
Chrome – phone/tablet/desktop, scrolled, with the mobile menu open – and keeps
every rule that matches something.

| Pages load (trimmed, generated) | Source (complete, edit this) |
|---|---|
| `assets/bootstrap/css/bootstrap.min.css` | `assets/bootstrap/css/bootstrap.full.min.css` |
| `assets/fonts/font-awesome.min.css` | `assets/fonts/font-awesome.full.min.css` |
| `assets/fonts/fontawesome-subset.woff2` | `assets/fonts/fontawesome-webfont.woff2` |

**Added a Bootstrap component, a new page, or a new icon** (e.g.
`<i class="fa fa-star">`) and it looks unstyled or the icon is blank?
Re-generate the trimmed files (needs Node.js and Chrome):

```bash
cd tools/trim-css && npm install && npm run trim
```

and, for icons, then from the repo root:

```bash
uv run --with fonttools --with brotli python tools/subset_icons.py
```

New pages need adding to the `PAGES` list in `tools/trim-css/trim-css.js`.
Quick fallback without the tools: point the page's `<link>` at
`bootstrap.full.min.css` / `font-awesome.full.min.css` (slower, but
complete – icons still need the subset re-run or the full font).

## Adding a Vimeo/YouTube video to the gallery

The gallery shows each video as a thumbnail with a play button; the real
player only loads when it's clicked (`assets/js/video-facade.js`), which
saves ~1 MB of player scripts per visit. To add one:

1. Copy the normal embed code from Vimeo/YouTube (Share → Embed) and paste
   it into `gallery.html` where you want it, inside a
   `<div class="col s12 m6 l6 video-containers">` like the others.
2. Convert it to a click-to-load preview (downloads the thumbnail into
   `assets/img/video-thumbs/`):

   ```bash
   uv run --with pillow python tools/video_facades.py --apply
   ```

3. Commit and push.

## Plans

See [PLAN.md](PLAN.md).
