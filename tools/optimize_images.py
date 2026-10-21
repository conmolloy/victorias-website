"""Convert JPG/PNG images referenced by the site's pages to WebP.

Resizes to at most 2000px, rewrites the references in the pages, and moves
the originals to _originals/ (gitignored). Files where WebP isn't smaller are
left alone, so it's safe to re-run whenever new photos are added.

usage (from the repo root):
    uv run --with pillow python tools/optimize_images.py           # dry run
    uv run --with pillow python tools/optimize_images.py --apply   # do it
"""
import os
import re
import shutil
import sys
from urllib.parse import unquote

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = "--apply" in sys.argv
MAX_SIDE = 2000
QUALITY = 80
PAGES = ["index.html", "gallery.html", "headshot.html", "resume.html",
         "reviews.html", "showreel.html"]
PAGES = [p for p in PAGES if os.path.exists(os.path.join(ROOT, p))]
REF = re.compile(r"assets[\\/][^\"'()<>&\n]*?\.(?:jpe?g|png)", re.I)


def exact_case(rel):
    """Return the on-disk path with real casing, or None if missing."""
    cur = ROOT
    parts = []
    for part in rel.split("/"):
        try:
            names = os.listdir(cur)
        except OSError:
            return None
        match = next((n for n in names if n == part), None) or \
            next((n for n in names if n.lower() == part.lower()), None)
        if match is None:
            return None
        parts.append(match)
        cur = os.path.join(cur, match)
    return "/".join(parts)


refs = {}  # raw ref string -> real relative path
for page in PAGES:
    text = open(os.path.join(ROOT, page), encoding="utf-8").read()
    for raw in set(REF.findall(text)):
        rel = unquote(raw).replace("\\", "/")
        real = exact_case(rel)
        refs.setdefault(raw, (rel, real, set()))[2].add(page)

missing = {r: v for r, v in refs.items() if v[1] is None}
case_bad = {r: v for r, v in refs.items() if v[1] and v[1] != v[0]}
files = sorted({v[1] for v in refs.values() if v[1]})

print(f"{len(refs)} distinct refs -> {len(files)} files")
for r, (rel, _, pages) in missing.items():
    print(f"  MISSING: {rel}  (in {', '.join(sorted(pages))})")
for r, (rel, real, pages) in case_bad.items():
    print(f"  CASE MISMATCH (broken on Linux): {rel} -> {real}")

stems = {}
for f in files:
    stems.setdefault(os.path.splitext(f)[0].lower(), []).append(f)
for s, fs in stems.items():
    if len(fs) > 1:
        print(f"  NAME CLASH: {fs}")

before = after = 0
skip = set()
for f in files:
    src = os.path.join(ROOT, f)
    dst = os.path.splitext(src)[0] + ".webp"
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        w, h = im.size
        if max(w, h) > MAX_SIDE:
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "transparency" in im.info or im.mode in ("LA", "P") else "RGB")
        out = dst if APPLY else os.path.join(os.environ.get("TMP", "/tmp"), "probe.webp")
        im.save(out, "WEBP", quality=QUALITY, method=6)
    a, b = os.path.getsize(src), os.path.getsize(out)
    if b >= a:
        skip.add(f)
        if APPLY:
            os.remove(out)
        b = a
    before += a
    after += b
    if a > 2_000_000 or b > a:
        print(f"  {f}: {w}x{h} {a/1e6:.1f}MB -> {b/1e6:.2f}MB")

print(f"total: {before/1e6:.1f} MB -> {after/1e6:.1f} MB")
if not APPLY:
    sys.exit()

# rewrite references
for page in PAGES:
    path = os.path.join(ROOT, page)
    text = open(path, encoding="utf-8").read()

    def repl(m):
        rel, real, _ = refs[m.group(0)]
        if real is None or real in skip:
            return m.group(0)
        new = os.path.splitext(real)[0] + ".webp"
        return new.replace(" ", "%20") if "%20" in m.group(0) else new
    text = REF.sub(repl, text)
    open(path, "w", encoding="utf-8", newline="").write(text)

# move converted originals out of the deployed tree
for f in files:
    if f in skip:
        continue
    dest = os.path.join(ROOT, "_originals", f)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.move(os.path.join(ROOT, f), dest)
print(f"applied; kept {len(skip)} originals: {sorted(skip)}")
