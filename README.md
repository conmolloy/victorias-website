# Victoria Adler – actor website

Portfolio site for Victoria Adler: headshots, gallery, showreel, CV and
reviews. Plain static HTML/CSS/JS – no build step, no PHP.

Each page loads the same small stack:

- **Bootstrap 4.6** with the Start Bootstrap *Grayscale* theme
  (`assets/bootstrap/`) – layout, navbar, mobile menu
- **jQuery 3.5** (needed by Bootstrap 4's JS) + `assets/js/grayscale.js`
  (smooth scrolling, navbar shrink on scroll) – loaded at the end of `<body>`
- **Font Awesome 4.7** icons (`assets/fonts/font-awesome.min.css`)
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
3. Commit and push.

Add `loading="lazy"` to `<img>` tags that aren't visible at the top of the
page.

## Adding or replacing videos

Export as **H.264** MP4, not HEVC/H.265 – HEVC doesn't play in Firefox or in
Chrome on many PCs. In HandBrake, the "Fast 1080p30" preset works; or with
ffmpeg:

```bash
ffmpeg -i input.mov -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart output.mp4
```

For a muted background video use `-crf 28 -an` instead (no audio track).
Keep files well under 100 MB.

## Plans

See [PLAN.md](PLAN.md).
