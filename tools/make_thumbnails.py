"""Make the smaller versions of gallery and headshot photos.

Browsers pick the smallest version that's sharp enough (srcset), so phones
and laptops don't download a 2000px photo for a 400px space. For every photo
listed in src/content/gallery.yaml and src/content/headshots.yaml this writes
<name>-400w.webp, -800w.webp and -1200w.webp next to it (only sizes smaller
than the photo itself, only the ones that are missing), made from the
full-quality original in _originals/ when there is one.

The build works out srcset/sizes/width/height from these files by itself
(src/lib/photos.ts) and stops with a message pointing here if one is missing.

usage (from the repo root):
    uv run --with pillow python tools/make_thumbnails.py            # dry run
    uv run --with pillow python tools/make_thumbnails.py --apply
"""
import os
import re
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = "--apply" in sys.argv
WIDTHS = [400, 800, 1200]
QUALITY = 80
DATA = ["src/content/gallery.yaml", "src/content/headshots.yaml"]
# `file: assets/...webp` lines (optionally quoted) in the data files
FILE = re.compile(r"""^[\s-]*file:\s*["']?(assets/[^"'#\n]+?\.webp)["']?\s*(?:#.*)?$""", re.M)


def find_original(path):
    """Full-quality source for a converted image, else the image itself."""
    folder = os.path.join(ROOT, "_originals", os.path.dirname(path))
    stem = os.path.splitext(os.path.basename(path))[0]
    if os.path.isdir(folder):
        for f in os.listdir(folder):
            if os.path.splitext(f)[0] == stem:
                return os.path.join(folder, f)
    return os.path.join(ROOT, "public", path)


photos = []
for data in DATA:
    for path in FILE.findall(open(os.path.join(ROOT, data), encoding="utf-8").read()):
        if path not in photos:
            photos.append(path)

made = missing_photos = 0
for path in photos:
    full = os.path.join(ROOT, "public", path)
    if not os.path.exists(full):
        print(f"  MISSING PHOTO: public/{path}")
        missing_photos += 1
        continue
    with Image.open(full) as im:
        full_w = im.width
    todo = [w for w in WIDTHS if w < full_w
            and not os.path.exists(f"{os.path.splitext(full)[0]}-{w}w.webp")]
    if not todo:
        continue
    print(f"  {path}: {', '.join(f'{w}w' for w in todo)}")
    if APPLY:
        with Image.open(find_original(path)) as orig:
            orig = ImageOps.exif_transpose(orig).convert("RGB")
            for w in todo:
                h = round(orig.height * w / orig.width)
                orig.resize((w, h), Image.LANCZOS).save(
                    f"{os.path.splitext(full)[0]}-{w}w.webp", "WEBP", quality=QUALITY, method=6)
    made += len(todo)

print(f"{len(photos)} photos, {made} smaller versions {'made' if APPLY else 'to make (dry run)'}"
      + (f", {missing_photos} photos missing" if missing_photos else ""))
