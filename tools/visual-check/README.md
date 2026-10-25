# Visual check

Compares two copies of the site – e.g. `main` before a change and the new
build – in Chrome (Puppeteer). Used to prove the Astro port is
pixel-identical to the old static site.

```bash
cd tools/visual-check && npm install
# serve both copies, e.g. the old site and the new build:
python -m http.server 8601 --directory <old copy>
python -m http.server 8602 --directory ../../dist
```

| Script                                  | What it does                                                                                                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node shoot.js <url> <dir>`             | full-page screenshots of every page, 1366px and 390px wide (videos/iframes hidden, lazy images forced in)                                                                                                                                                        |
| `node diff.js <dirA> <dirB> <out>`      | pixel diff of same-named screenshots; prints changed pixels, height change, first changed row                                                                                                                                                                    |
| `node states.js <url> <dir>`            | interactive states: phone menu open/focused, navbar shrunk after scrolling, hover on nav link / buttons / video previews, a photo open in the lightbox                                                                                                           |
| `node behave.js <url>`                  | behaviour: console errors, failed requests, menu open/close, navbar shrink, smooth scrolling, video preview → player, CV PDF renders, icons                                                                                                                      |
| `node dom.js <urlA> <urlB>`             | parses each page as the browser does and diffs the element trees (ignores comments, whitespace, `?v=` hashes)                                                                                                                                                    |
| `node stale.js <oldDir> <newDir> <out>` | returning visitor: caches the old site's CSS/JS for 30 days like the live server, then loads the new site at the same address and screenshots it                                                                                                                 |
| `node cms.js <siteUrl> <repoDir> <out>` | the editing screen at `<siteUrl>/admin/` without signing in (its local-repository mode, pointed at a copy of the content and photos in the browser's storage): screenshots each page's editor and live preview, checks every photo loads, reports console errors |

A few pixels of difference inside photos (image decoding) or inside audio
players (buffering progress) are noise.

Chrome is expected at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
