# Website plan

Deploys automatically: push to `main` → GitHub Actions → `astro build` →
rsync `dist/` to Cloudways (`.github/workflows/deploy.yml`). Unused media listed in `.gitignore` isn't in
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
- [x] **Gallery thumbnails** – 400/800/1200px versions of every gallery photo + `srcset`/`sizes` (sized for the hover zoom, so zoomed photos are as
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
      Full versions kept as `*.full.min.css`. Pixel-identical (12 full pages + 29 interactive-state screenshots). Fixed two syntax errors in the
      theme file that browsers were already ignoring. Lighthouse (median of
      3): home 66 → 85, gallery 75 → 81, headshots 71 → 84, CV 72 → 88,
      reviews 72 → 92, showreel 77 → 92; first paint roughly halved.

## Speed test (Lighthouse, simulated mobile, 2026-10-22)

| Page      | Weight before → after | Main content shown (LCP) before → after |
| --------- | --------------------- | --------------------------------------- |
| Home      | 39.2 → 5.0 MB         | 14.7 → 12.5 s                           |
| Gallery   | 46.3 → 11.1 MB        | 38.0 → 25.5 s                           |
| Headshots | 31.1 → 5.6 MB         | 66.6 → 15.9 s                           |
| Showreel  | 113.3 → 1.1 MB        | 19.2 → 5.4 s                            |

Raw numbers for all four versions + the live Lighthouse HTML reports are in
[`perf/2026-10-22/`](perf/2026-10-22/).

Scores stayed ~55–72: first paint was held up by framework CSS/JS, not media.

### After step 3 (Bootstrap only)

| Page      | Score   | First paint (FCP) | Main content (LCP) | Requests  |
| --------- | ------- | ----------------- | ------------------ | --------- |
| Home      | 60 → 67 | 6.0 → 4.1 s       | 9.6 → 6.8 s        | 44 → 35   |
| Gallery   | 60 → 64 | 5.0 → 3.3 s       | 25.5 → 25.7 s      | 210 → 202 |
| Headshots | 64 → 69 | 4.2 → 3.0 s       | 9.5 → 8.5 s        | 65 → 60   |
| Showreel  | 72 → 74 | 3.5 → 2.9 s       | 5.4 → 5.5 s        | 45 → 36   |
| Reviews   | 66 → 72 | 4.1 → 2.9 s       | 7.3 → 6.3 s        | 33 → 32   |

([`perf/2026-10-22/bootstrap-only.json`](perf/2026-10-22/bootstrap-only.json).)
Gallery LCP is now limited by its full-size photos – see _Gallery thumbnails_.

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

- [x] **4. Astro + TypeScript (phase 1: faithful port)** – the 6 pages are
      now `src/pages/*.astro` on a shared `BaseLayout` (head, fonts, GTM,
      scripts) + `Navbar` + `Contact` components instead of copy-pasted
      HTML; per-page differences (title, lang, favicon, font preloads,
      Outfit/site-base CSS, brand link, body id/style, CV page's PDF.js) are
      props/slots. Assets moved to `public/` (same URLs), `build.format: 'file'` keeps `gallery.html` etc., `?v=` hashes now come from the build
      (`src/lib/asset.ts`, same hash as `tools/cache_bust.py`, so unchanged
      files keep their cached URL). Deploy builds and uploads `dist/`; PRs
      get a build check. Tools updated for the new layout; Puppeteer checks
      kept in `tools/visual-check/`.
      Verified against `main`: 12 full-page screenshots (1366 + 390px)
      identical apart from the gallery audio players' buffering bars (which
      vary run to run); 31/31 interactive states (menu open/focus, scrolled
      navbar, nav hover, button / video preview / zoom photo hover)
      identical; parsed DOM identical except head order on home and the
      end-of-body scripts' parent on headshots/reviews (see PR); same
      behaviour (menu, navbar shrink, smooth scroll, video previews, CV PDF,
      no console errors); returning visitor with 30-day-cached CSS/JS from
      the old site sees the same pixels; trimmed CSS regenerates identically.

- [x] **Dev tooling** (as recommended in the Astro docs) – Prettier with
      the Astro plugin (repo formatted; pages render identically: 12
      full-page screenshots + 31 interactive states vs the live build), ESLint
      (JS/TS, Astro, accessibility) + Stylelint, Vitest unit tests with
      Astro's Container API, build-output tests (missing files, wrong-case
      names, stale `?v=` hashes), Playwright end-to-end tests in Chrome
      (desktop + phone). `npm run verify` runs everything; GitHub Actions
      runs it on every PR (`ci.yml`) and the deploy runs the fast tests
      before uploading. Also: `.gitattributes` (LF everywhere, so local `?v=`
      hashes match the server's), `.editorconfig`, `.nvmrc`, VS Code
      recommended extensions + format on save, Dependabot, fixed 4 harmless
      CSS mistakes Stylelint found and 10 audio paths written with `\`.

## Next

- [x] **Gallery is too wide on phones** (found by the new phone tests,
      also on the live site before the Astro port): the video blocks make the
      page 430px wide on a 390px phone, so it scrolls sideways and the menu
      button is partly off-screen. Cause: the 400px `min-width` on
      `.video-containers`, now `min(400px, 100%)` (videos still stack on
      tablets).
      Below 390px the audio players (300px + 15% margin) and the
      "Certificates" heading were also too wide; they now fit the column.
      Gallery fits at 320–430px; desktop screenshots of every page and phone
      screenshots of the other pages unchanged. `test.fail(...)` removed.
- [x] **Link previews and search listings**: every page has its own title
      and description (search results), a canonical address (the
      extension-less one), Open Graph + Twitter card tags so shared links
      show Victoria's photo, name and a one-line description, and the home
      page has schema.org `Person` data with her Spotlight/IMDb/Instagram.
      Preview image: 1200×630 JPEG from the first 2024 headshot
      (`tools/make_share_image.py`). Added `sitemap.xml` and `robots.txt`.
      Pages look identical.
- [x] **Consistent `<head>`**: every page now has `lang="en"` and the
      favicon, from the shared layout (reviews, gallery and headshots had no
      `lang`; CV and showreel had no favicon). The `lang`/`favicon` layout
      props are gone; build-output tests check both on every page.
- [x] **Home (320–385px) and reviews (320px) were too wide on the smallest
      phones**: the home headshot's 370px minimum now only applies from 385px
      up; below 360px the review cards drop the 40px side margins on
      `<figure>`, so "(Macduff/Witch/others)" fits. Every page now fits at
      320/360/375/390/430px, and the phone e2e test checks all five widths.
      Desktop and 390px screenshots unchanged.
- [x] **Accessibility**: `alt` text for all 114 photos/logos (show and
      company for gallery photos, photographer and year for headshots,
      site name for the profile logos, what each certificate is), labels
      for the menu button and the phone/email icons, a title for the GTM
      iframe (video previews already pass theirs on to the player). The
      songs, voice reels and showreel have no captions: the eslint rule is
      off for those 7 elements, with a comment. The jsx-a11y lint rules
      are errors again (`eslint.config.js`).
- [ ] Captions/transcripts for the showreel and the two voice reels
      (a WebVTT file for the video, a text transcript next to the audio).
- [ ] Python tools (`tools/*.py`) have no linter/tests yet – add Ruff if
      they grow.
- [ ] `npm audit`: 6 "high" warnings, all one advisory in `braces` (used only
      by Stylelint's file matching, dev-only, never shipped); no fixed
      version yet – Dependabot will pick it up.
- [x] **Content in data files** (Astro phase 2, part 1): the gallery
      (16 shows, misc/dance photos, voice reels, songs, videos,
      certificates), headshots (4 shoots) and reviews (5 press + 4 coaching;
      the home page shows the ones marked `home: true`) come from
      `src/content/*.yaml`, checked against a schema when building (a
      misspelt field, missing alt text or credit, or a photo/thumbnail/
      audio/preview image that doesn't exist stops the build with a clear
      message). `srcset`/`sizes`/`width`/`height` are worked out from the
      image files. README has a "How to update the site" guide. Pages look
      identical (full-page screenshots desktop + 390px, 30 interactive
      states, behaviour checks).
- [ ] **Editing screen for Victoria** (after the content-files PR): a
      Git-based CMS at `/admin` (trial Sveltia CMS first – free, static, no
      extra service; TinaCMS if she wants live visual editing; also Decap /
      Keystatic) on top of the `src/content/*.yaml` data, so she can add
      productions, photos, headshots and reviews herself. Saves commit to
      GitHub, then CI checks + deploy as now. Needs: ~~thumbnails generated
      automatically in CI when photos are uploaded~~ (done: the build makes
      them with `astro:assets`), logins via GitHub with 2FA
      (or the CMS's own auth / a small Cloudflare OAuth helper), a decision
      on publish-directly vs edits-as-PR, and consider making the repo
      private (drafts/uploads are public while it's public). Trial with
      Victoria before committing to one tool.
- [ ] **Astro phase 2** (each needs its own visual check):
  - [x] Bootstrap 5 (drops jQuery + Bootstrap 4 JS); `grayscale.js` and
        `video-facade.js` as TypeScript `<script>`s – CSS built from Bootstrap
        5.3's Sass by `tools/bootstrap` with Bootstrap 4's values, pixel-identical
  - [x] home/reviews on the same base styles as the other pages (drop
        `site-base.css`), clean up inline `style=` and Materialize-era classes
        (`col s4`, `grey darken-4`, `waves-effect`) – their smaller text size is
        now `<body class="compact">` (`--page-rem`), pixel-identical; removing
        `compact` from index/reviews would give them the other pages' size
  - [x] `astro:assets` (`<Image>`) instead of `tools/make_thumbnails.py`: Astro
        would make the smaller versions itself – but every image address (and
        file) changes, so it needs its own check – gallery/headshot photos moved
        to `src/assets/img/`, `getImage()` makes the 400/800/1200px versions in
        `/_astro/`, the full-size photo is served unchanged; layout identical
  - [x] tidy the layout quirks the data-driven pages still reproduce on purpose
        (visual changes, so with Victoria's OK): the 2nd and 3rd shows and the
        later headshot shoots are each indented a little more than the one
        before (nested containers from the old HTML); the first review card's
        border is thinner (.5rem) than the others (.6rem); the old Materialize
        column classes (`col s4`, `col s12 m6 l6`) do nothing any more – every
        show and gallery section is now 1080px wide (was 1110/1080/1050), every
        headshot shoot 1140px, all press reviews have the .6rem border; the
        column classes went in part 2 (no visible change)
  - copy edits for Victoria to confirm (shown as written today): "Isreal
    Hands", "Perpper & Salt", "Royale Dickens Company", "Reggeaton",
    lower-case show titles ("a phoenix too frequent", "A christmas carol"…),
    "By The School of the Science of Acting" (Time and the Conways)

## Housekeeping

- [x] Removed unused images, CSS/JS, `favicon - Copy.ico` and `david-site/`
      from the repo (still on the server – deploy never deletes; remove by SFTP)
- [x] README + `tools/optimize_images.py` for converting new photos
- [ ] `public/assets/cv/VICTORIA ADLER CV 2024.pdf` is the old CV (the CV page shows
      the 2025 one) – remove once no one has the old link
- [x] Use `/` instead of `\` in remaining asset paths
- [ ] Nav links use `href="resume"` etc. (no `.html`) – relies on server config
