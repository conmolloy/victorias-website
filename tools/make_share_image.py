"""Make the link-preview image (Open Graph / Twitter card) from a headshot.

When a link to the site is shared (WhatsApp, iMessage, email, LinkedIn,
Facebook, X), apps show this 1200x630 JPEG: the headshot's head and
shoulders in the middle (so apps that crop previews to a square still show
the face), with the sides filled by a blurred copy of the photo it fades into.

Uses the full-quality original in _originals/ when it's there (local only),
otherwise the committed WebP, so it can always be re-made.

usage (from the repo root):
    uv run --with pillow python tools/make_share_image.py [source image]
To use a different photo or framing, change SOURCE / TOP / BOTTOM below, re-run,
and commit the new public/assets/img/share/victoria-adler.jpg.
"""
import os
import sys

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = "assets/img/headshot 2024/q3/victoria-7646-3"  # first 2024 headshot
# part of the photo shown (fractions of its height): top of the hair to the shoulders
TOP, BOTTOM = 0.02, 0.66
SIZE = (1200, 630)  # Open Graph's recommended size (1.91:1)
OUT = os.path.join(ROOT, "public", "assets", "img", "share", "victoria-adler.jpg")


def source_path():
    if len(sys.argv) > 1:
        return sys.argv[1]
    for path in (
        os.path.join(ROOT, "_originals", SOURCE + ".jpg"),
        os.path.join(ROOT, "public", SOURCE + ".webp"),
    ):
        if os.path.exists(path):
            return path
    raise SystemExit(f"no source image for {SOURCE}")


src = source_path()
im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
W, H = SIZE

# head and shoulders, scaled to the card's height
portrait = im.crop((0, round(im.height * TOP), im.width, round(im.height * BOTTOM)))
portrait = portrait.resize((round(portrait.width * H / portrait.height), H), Image.LANCZOS)

# background: the same photo filling the card, blurred and slightly darker
scale = W / im.width
background = im.resize((W, round(im.height * scale)), Image.LANCZOS)
top = round(background.height * (TOP + BOTTOM) / 2 - H / 2)
background = background.crop((0, top, W, top + H)).filter(ImageFilter.GaussianBlur(28))
background = ImageEnhance.Brightness(background).enhance(0.85)

# fade the photo's left/right edges into the background (no hard seam)
FADE = 90
mask = Image.new("L", portrait.size, 255)
for x in range(FADE):
    a = round(255 * x / FADE)
    mask.paste(a, (x, 0, x + 1, portrait.height))
    mask.paste(a, (portrait.width - 1 - x, 0, portrait.width - x, portrait.height))

card = background
card.paste(portrait, ((W - portrait.width) // 2, 0), mask)
im = card

os.makedirs(os.path.dirname(OUT), exist_ok=True)
im.save(OUT, "JPEG", quality=82, optimize=True, progressive=True)
print(f"{os.path.relpath(src, ROOT)} -> {os.path.relpath(OUT, ROOT)}: "
      f"{SIZE[0]}x{SIZE[1]}, {os.path.getsize(OUT) / 1024:.0f} KB")
