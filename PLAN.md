# Website plan

Deploys automatically: push to `main` → GitHub Actions → rsync to Cloudways
(`.github/workflows/deploy.yml`). Files not in git (`Showreel.mp4`, unused
media) only exist on the server and must be uploaded by FTP.

## Done
- [x] GitHub Actions deploy to Cloudways (replaces FTP uploads)
- [x] Unused audio/video excluded from the repo
- [x] **1. Images** – all referenced images converted to WebP (max 2000px,
      quality 80): 92 MB → 16.5 MB. `loading="lazy"` on below-the-fold images.
      Fixed 3 headshots that 404'd on the server due to `.jpg`/`.JPG` case.
      Full-size originals kept locally in `_originals/` (not committed).

## Next
- [ ] **2. Videos** – compress `12-2024-header-1920.mp4` (36 MB, homepage
      background) and `Showreel.mp4` (105 MB; needs < 100 MB to go in git),
      or host the showreel on YouTube/Vimeo.
- [ ] **3. One CSS framework** – pages load Bootstrap *and* Materialize (plus
      jQuery); standardise on one.
- [ ] **4. Astro + TypeScript** – shared nav/footer components instead of
      copy-pasted HTML, built in the deploy workflow before the rsync.

## Housekeeping
- [x] Removed unused images, CSS/JS, `favicon - Copy.ico` and `david-site/`
      from the repo (still on the server – deploy never deletes; remove by SFTP)
- [x] README + `tools/optimize_images.py` for converting new photos
- [ ] `assets/cv/VICTORIA ADLER CV 2024.pdf` isn't linked from any page – link
      it from the CV page or remove it
- [ ] Use `/` instead of `\` in remaining asset paths
- [ ] Nav links use `href="resume"` etc. (no `.html`) – relies on server config
