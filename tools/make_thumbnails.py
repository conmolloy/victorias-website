"""Give gallery and headshot photos smaller versions + srcset so browsers
download only the size they actually display.

For every zoomable photo (<img class="... zoom ..."> in src/pages/gallery.astro,
<img class="... zoom-hs ..."> in src/pages/headshot.astro) without a srcset it:
  - writes <name>-400w.webp, -800w.webp, -1200w.webp next to the image
    (only sizes smaller than the image itself), made from the full-quality
    original in _originals/ when there is one
  - adds srcset and sizes (and width/height if missing)

`sizes` comes from the column widths measured at each breakpoint:
  - gallery: at the hover-zoomed size (1.6x on desktop, 2.8x under 1000px –
    see .zoom:hover in Projects-Clean.css), since zooming is how you view
    the small thumbnails, on phones too
  - headshots: zoomed (1.6x, .zoom-hs:hover) on desktop; at the normal size
    on phones/tablets, where the photos are already full width
Safe to re-run: images that already have a srcset are skipped.

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
WIDTHS = [400, 800, 1200]
QUALITY = 80

# Bootstrap container widths below 992px: 540px (sm), 720px (md), minus 30px padding
SMALL_SCREENS = "(min-width: 768px) 690px, (min-width: 576px) 510px, calc(100vw - 30px)"


def gallery_sizes(cls, column):
    if "certificate" in cls:
        return "(min-width: 1200px) 864px, (min-width: 1001px) 720px, 126vw"
    return "(min-width: 1200px) 592px, (min-width: 1001px) 496px, 87vw"


def headshot_sizes(cls, column):
    if "col-lg-6" in column:   # 2 per row on desktop: 540px / 450px, x1.6
        return f"(min-width: 1200px) 864px, (min-width: 992px) 720px, {SMALL_SCREENS}"
    return f"(min-width: 1200px) 560px, (min-width: 992px) 464px, {SMALL_SCREENS}"  # 3 per row: 350 / 290


# page -> (class that marks a zoomable photo, sizes function); paths are
# relative to public/, where the images are
PAGES = {
    "../src/pages/gallery.astro": ("zoom", gallery_sizes),
    "../src/pages/headshot.astro": ("zoom-hs", headshot_sizes),
}

IMG = re.compile(r"<img\b[^>]*>", re.I)
COLUMN = re.compile(r'class="(col-[^"]*)"')
os.chdir(os.path.join(ROOT, "public"))  # image paths in the pages are relative to public/


def attr(tag, name):
    m = re.search(rf'\b{name}="([^"]*)"', tag)
    return m.group(1) if m else None


def find_original(path):
    """Full-quality source for a converted image, else the image itself."""
    folder = os.path.join("..", "_originals", os.path.dirname(path))
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
for page, (marker, sizes_for) in PAGES.items():
    text = open(page, encoding="utf-8", newline="").read()
    done = 0

    def process(m):
        global total_before, total_after, done
        tag = m.group(0)
        cls = (attr(tag, "class") or "").split()
        if marker not in cls or "srcset=" in tag:
            return tag
        columns = COLUMN.findall(text, 0, m.start())
        column = columns[-1] if columns else ""
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
        extra = f'srcset="{", ".join(candidates)}" sizes="{sizes_for(cls, column)}"'
        if attr(tag, "width") is None:
            extra += f' width="{full_w}" height="{full_h}"'
        done += 1
        return tag.replace(f'src="{src}"', f'src="{src}" {extra}', 1)

    text = IMG.sub(process, text)
    print(f"{page}: {done} images")
    if APPLY:
        open(page, "w", encoding="utf-8", newline="").write(text)

print(f"full-size total: {total_before/1e6:.1f} MB"
      + (f"; 800w total: {total_after/1e6:.1f} MB" if APPLY else " (dry run)"))
