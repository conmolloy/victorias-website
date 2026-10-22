"""Add a content-based version to every local CSS/JS link in the pages.

The server tells browsers to keep CSS/JS for 30 days, so after a change
returning visitors would keep using the old file with the new HTML (which
broke the gallery videos and headshots once). This rewrites e.g.
    href="assets/css/Projects-Clean.css"  ->  href="assets/css/Projects-Clean.css?v=3f2a91c0"
where the version is a hash of the file's contents, so the address changes
whenever the file does and browsers fetch the new one.

The deploy workflow runs this automatically before uploading; you can also
run it yourself (no dependencies). Safe to re-run.

usage (from the repo root):
    python tools/cache_bust.py
"""
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ["index.html", "gallery.html", "headshot.html", "resume.html", "reviews.html", "showreel.html"]
REF = re.compile(r'(\b(?:href|src)=")((?:assets/)[^"?#]+\.(?:css|js))(\?v=[0-9a-f]*)?(")')


def version(path):
    with open(os.path.join(ROOT, path), "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


changed = 0
for page in PAGES:
    full = os.path.join(ROOT, page)
    text = open(full, encoding="utf-8", newline="").read()

    def repl(m):
        path = m.group(2)
        if not os.path.exists(os.path.join(ROOT, path)):
            return m.group(0)
        return f"{m.group(1)}{path}?v={version(path)}{m.group(4)}"

    new = REF.sub(repl, text)
    if new != text:
        open(full, "w", encoding="utf-8", newline="").write(new)
        changed += 1
print(f"cache-busting versions updated in {changed} page(s)")
