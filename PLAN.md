# Website plan

Deploys automatically: push to `main` → GitHub Actions → rsync to Cloudways
(`.github/workflows/deploy.yml`). Unused media listed in `.gitignore` isn't in
git; the deploy never deletes files on the server.

## Done
- [x] GitHub Actions deploy to Cloudways (replaces FTP uploads)
- [x] Unused audio/video excluded from the repo
- [x] **1. Images** – all referenced images converted to WebP (max 2000px,
      quality 80): 92 MB → 16.5 MB. `loading="lazy"` on below-the-fold images.
      Fixed 3 headshots that 404'd on the server due to `.jpg`/`.JPG` case.
      Full-size originals kept locally in `_originals/` (not committed).
- [x] **2. Videos** – both were HEVC (didn't play in Firefox / many Chrome
      setups). Re-encoded to H.264 1080p: header 35 → 7.9 MB (audio track
      dropped, it's muted), showreel 105 → 47 MB, now in git. Showreel only
      downloads when played (`preload="metadata"`).
- [x] **3. Bootstrap only** – removed Materialize (CSS + JS), the second copy
      of `bootstrap.min.js`, lightbox2, jQuery Easing, Font Awesome 5, Ionicons
      and 2 unused stylesheets; scripts now load once, at the end of `<body>`;
      CV page no longer downloads the PDF.js worker twice. The few Materialize
      rules home/reviews depended on live in `assets/css/site-base.css` (5 KB
      vs 180 KB). Verified pixel-identical (full-page screenshots, desktop +
      phone, all 6 pages) and same behaviour (menu, scrolling, CV viewer).
- [x] **Gallery thumbnails** – 400/800/1200px versions of every gallery photo
      + `srcset`/`sizes` (sized for the hover zoom, so zoomed photos are as
      sharp as before) + `width`/`height`. Whole-gallery image download:
      12.6 MB → 3.2 MB (desktop, mobile) / 5.8 MB (Retina laptop, 3x phone).
      Gallery LCP 25.7 → 9.8 s, weight 10.9 → 4.3 MB (median of 5 runs).
      Tool: `tools/make_thumbnails.py`.
- [x] **Gallery video embeds** – the 7 Vimeo/YouTube players are now
      click-to-load previews (local thumbnail + play button; the player loads
      and autoplays on click, and the link opens the video if JS is off).
      Same size and position as before, nothing moves on click. Gallery
      (median of 5): score 65 → 71, first paint 3.5 → 2.6 s, JS 1.9 → 0.5 MB,
      weight 4.3 → 2.5 MB, requests 203 → 81. Tool: `tools/video_facades.py`.
- [x] **Self-hosted fonts** – Lora, Cabin, Roboto, Outfit now served from
      `assets/fonts/` (same files Google served, latin + latin-ext only,
      `font-display: swap`, first-screen fonts preloaded) instead of a
      render-blocking chain through Google (theme `@import` → Google CSS →
      font files). Google Fonts requests per page 5–8 → 0. Pixel-identical.
      Each page keeps exactly the fonts it had (home navbar still falls back
      to Arial – it asks for Roboto but home never loaded it).
      Faster first paint exposed a layout shift on headshots (photos had no
      dimensions) → added width/height: headshots CLS 0.051 → 0.
      Median of 3: gallery 71 → 80 (LCP 9.2 → 4.8 s), reviews LCP 6.2 → 4.5 s,
      showreel 74 → 78, home/headshots ≈ same.
- [x] **Headshot thumbnails** – 400/800/1200px versions + `srcset` (sized for
      the 1.6x hover zoom on desktop, normal size on phones where photos are
      full width). Whole-page download 4.6 MB → 2.5 MB desktop, 1.6 MB
      Lighthouse mobile, 3.2 MB 3x phone; same sharpness. Headshots LCP
      8.7 → 5.9 s (all 3 runs).
- [x] **First-screen photos** – the top headshot row and the first gallery
      row no longer lazy-load; first headshot has `fetchpriority="high"`.
      Gallery first-row photos on a throttled phone: done at ~3.5 s instead
      of ~21 s, heading LCP unchanged. (Also making gallery row 2 eager
      hurt Lighthouse's simulated LCP 5.0 → 6.6 s, so row 2 stays lazy.)
- [x] **Trimmed CSS + icon font** – `tools/trim-css` keeps only the Bootstrap
      theme / Font Awesome rules the pages use (checked in every state:
      phone/tablet/desktop, scrolled, menu open): 159 → 11 KB and 30 → 1 KB;
      icon font cut to the 4 icons used (75 → 1 KB, `tools/subset_icons.py`).
      Full versions kept as `*.full.min.css`. Pixel-identical (12 full pages
      + 29 interactive-state screenshots). Fixed two syntax errors in the
      theme file that browsers were already ignoring. Lighthouse (median of
      3): home 66 → 85, gallery 75 → 81, headshots 71 → 84, CV 72 → 88,
      reviews 72 → 92, showreel 77 → 92; first paint roughly halved.

## Speed test (Lighthouse, simulated mobile, 2026-10-22)
| Page | Weight before → after | Main content shown (LCP) before → after |
|---|---|---|
| Home | 39.2 → 5.0 MB | 14.7 → 12.5 s |
| Gallery | 46.3 → 11.1 MB | 38.0 → 25.5 s |
| Headshots | 31.1 → 5.6 MB | 66.6 → 15.9 s |
| Showreel | 113.3 → 1.1 MB | 19.2 → 5.4 s |

Raw numbers for all four versions + the live Lighthouse HTML reports are in
[`perf/2026-10-22/`](perf/2026-10-22/).

Scores stayed ~55–72: first paint was held up by framework CSS/JS, not media.

### After step 3 (Bootstrap only)
| Page | Score | First paint (FCP) | Main content (LCP) | Requests |
|---|---|---|---|---|
| Home | 60 → 67 | 6.0 → 4.1 s | 9.6 → 6.8 s | 44 → 35 |
| Gallery | 60 → 64 | 5.0 → 3.3 s | 25.5 → 25.7 s | 210 → 202 |
| Headshots | 64 → 69 | 4.2 → 3.0 s | 9.5 → 8.5 s | 65 → 60 |
| Showreel | 72 → 74 | 3.5 → 2.9 s | 5.4 → 5.5 s | 45 → 36 |
| Reviews | 66 → 72 | 4.1 → 2.9 s | 7.3 → 6.3 s | 33 → 32 |

([`perf/2026-10-22/bootstrap-only.json`](perf/2026-10-22/bootstrap-only.json).)
Gallery LCP is now limited by its full-size photos – see *Gallery thumbnails*.

- [x] **"Read Review" buttons** no longer go blank on hover (text stays
      white; Bootstrap's `.btn:hover` made it dark grey on the dark button).
- [x] **Varnish turned off** (Cloudways → Application Settings) – it cached
      the HTML at `/` and `/gallery` etc. and deploys didn't purge it, so
      visitors got stale pages (`/` had lost its fonts). Checked: no
      `x-cache` headers, `/` identical to `/index.html`, fonts load.
- [x] **Home navbar** now uses Roboto like every other page (was falling back
      to Arial). Before/after: `perf/2026-10-22/navbar-and-hover-fix.png`.

- [x] **Google Tag Manager deferred** – loads on first scroll/tap/click/key,
      3 s after load, or when the tab is hidden. Verified on the live site
      that GA4 page_view and the Ads/remarketing tags still fire (and are
      flushed if the visitor leaves); only visits that leave within ~3 s
      without interacting aren't counted. LIVE Lighthouse (median of 3):
      home 72 → 93, gallery 69 → 82, headshots 73 → 94, CV 65 → 80,
      reviews 78 → 99, showreel 73 → 96.
- [x] **Cache-busting** – browsers keep CSS/JS for 30 days, so returning
      visitors combined old cached `Projects-Clean.css` with new HTML: gallery
      videos collapsed and headshots stretched (2026-10-22). Every local
      CSS/JS link now carries `?v=<content hash>` (`tools/cache_bust.py`),
      and the deploy workflow runs it automatically before uploading.

## Next
- [ ] **4. Astro + TypeScript** – shared nav/footer components instead of
      copy-pasted HTML, built in the deploy workflow before the rsync. Good
      moment to move to Bootstrap 5 (drops jQuery) and make home/reviews use
      the same base styles as the other pages.

## Housekeeping
- [x] Removed unused images, CSS/JS, `favicon - Copy.ico` and `david-site/`
      from the repo (still on the server – deploy never deletes; remove by SFTP)
- [x] README + `tools/optimize_images.py` for converting new photos
- [ ] `assets/cv/VICTORIA ADLER CV 2024.pdf` is the old CV (the CV page shows
      the 2025 one) – remove once no one has the old link
- [ ] Use `/` instead of `\` in remaining asset paths
- [ ] Nav links use `href="resume"` etc. (no `.html`) – relies on server config
