"""Give gallery photos smaller versions + srcset so browsers download only
the size they actually display.

For every <img class="... zoom ..."> in the page(s) without a srcset it:
  - writes <name>-400w.webp, -800w.webp, -1200w.webp next to the image
    (only sizes smaller than the image itself), made from the full-quality
    original in _originals/ when there is one
  - adds srcset, sizes, width and height attributes

`sizes` describes the photo at its hover-zoomed size (1.6x on desktop, 2.8x
under 1000px – see .zoom:hover in Projects-Clean.css) so zoomed photos stay
sharp. Safe to re-run: images that already have a srcset are skipped.

usage (from the repo root):
    uv run --with pillow python tools/make_thumbnails.py            # dry run
    uv run --with pillow python tools/make_thumbnails.py --apply
"""
import os
import re
import sys
from urllib.parse import quote, unquote

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = "--apply" in sys.argv
PAGES = ["gallery.html"]
WIDTHS = [400, 800, 1200]
QUALITY = 80

# Column widths measured at each breakpoint, multiplied by the hover zoom.
SIZES = {
    "certificate": "(min-width: 1200px) 864px, (min-width: 1001px) 720px, 126vw",
    "default": "(min-width: 1200px) 592px, (min-width: 1001px) 496px, 87vw",
}

IMG = re.compile(r"<img\b[^>]*>", re.I)
os.chdir(ROOT)


def attr(tag, name):
    m = re.search(rf'\b{name}="([^"]*)"', tag)
    return m.group(1) if m else None


def find_original(path):
    """Full-quality source for a converted image, else the image itself."""
    folder = os.path.join("_originals", os.path.dirname(path))
    stem = os.path.splitext(os.path.basename(path))[0]
    if os.path.isdir(folder):
        for f in os.listdir(folder):
            if os.path.splitext(f)[0] == stem:
                return os.path.join(folder, f)
    return path


def url(path):
    # srcset separates candidates with spaces/commas, so spaces must be encoded
    return quote(path, safe="/()-_.~'!")


total_before = total_after = 0
for page in PAGES:
    text = open(page, encoding="utf-8", newline="").read()
    done = 0

    def process(m):
        global total_before, total_after, done
        tag = m.group(0)
        cls = attr(tag, "class") or ""
        if "zoom" not in cls.split() or "srcset=" in tag:
            return tag
        src = attr(tag, "src")
        path = unquote(src).replace("\\", "/")
        with Image.open(path) as im:
            full_w, full_h = im.size
        source = find_original(path)
        candidates = []
        with Image.open(source) as orig:
            orig = ImageOps.exif_transpose(orig).convert("RGB")
            for w in WIDTHS:
                if w >= full_w:
                    continue
                out = f"{os.path.splitext(path)[0]}-{w}w.webp"
                if APPLY:
                    h = round(orig.height * w / orig.width)
                    orig.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=QUALITY, method=6)
                    total_after += os.path.getsize(out) if w == 800 else 0
                candidates.append(f"{url(out)} {w}w")
        candidates.append(f"{url(path)} {full_w}w")
        total_before += os.path.getsize(path)
        sizes = SIZES["certificate"] if "certificate" in cls.split() else SIZES["default"]
        new = tag.replace(f'src="{src}"', f'src="{src}" srcset="{", ".join(candidates)}" '
                                          f'sizes="{sizes}" width="{full_w}" height="{full_h}"', 1)
        done += 1
        return new

    text = IMG.sub(process, text)
    print(f"{page}: {done} images")
    if APPLY:
        open(page, "w", encoding="utf-8", newline="").write(text)

print(f"full-size total: {total_before/1e6:.1f} MB"
      + (f"; 800w total: {total_after/1e6:.1f} MB" if APPLY else " (dry run)"))
