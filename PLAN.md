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

## Next
- [ ] **Gallery thumbnails** – gallery shows ~300px thumbnails but downloads
      2000px images (8.8 MB); generate small versions + `srcset`.
- [ ] **Cache headers** – 128 static files are served without long-lived
      caching; add expiry headers so repeat visits are instant.
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
