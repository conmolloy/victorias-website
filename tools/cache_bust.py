"""Add a content-based version to every local CSS/JS link in the built pages.

The server tells browsers to keep CSS/JS for 30 days, so after a change
returning visitors would keep using the old file with the new HTML (which
broke the gallery videos and headshots once). This rewrites e.g.
    href="assets/css/Projects-Clean.css"  ->  href="assets/css/Projects-Clean.css?v=3f2a91c0"
where the version is a hash of the file's contents, so the address changes
whenever the file does and browsers fetch the new one.

The Astro build already does this (src/lib/asset.ts, same hash), so on a
normal build it changes nothing; the deploy workflow runs it on dist/ after
`astro build` as a safety net, e.g. for a link added to a page without v().
No dependencies. Safe to re-run.

usage (from the repo root, after `npm run build`):
    python tools/cache_bust.py            # the built site in dist/
    python tools/cache_bust.py <folder>   # any folder of .html pages + assets/
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "dist")
REF = re.compile(r'(\b(?:href|src)=")((?:assets/)[^"?#]+\.(?:css|js))(\?v=[0-9a-f]*)?(")')


def version(path):
    with open(os.path.join(SITE, path), "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


pages = sorted(f for f in os.listdir(SITE) if f.endswith(".html")) if os.path.isdir(SITE) else []
if not pages:
    sys.exit(f"no .html pages in {SITE} - run `npm run build` first")

changed = 0
for page in pages:
    full = os.path.join(SITE, page)
    text = open(full, encoding="utf-8", newline="").read()

    def repl(m):
        path = m.group(2)
        if not os.path.exists(os.path.join(SITE, path)):
            return m.group(0)
        return f"{m.group(1)}{path}?v={version(path)}{m.group(4)}"

    new = REF.sub(repl, text)
    if new != text:
        open(full, "w", encoding="utf-8", newline="").write(new)
        changed += 1
print(f"cache-busting versions updated in {changed} of {len(pages)} page(s) in {os.path.relpath(SITE, ROOT)}")
