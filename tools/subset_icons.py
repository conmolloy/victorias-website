"""Cut the Font Awesome font down to the icons the site actually uses.

Reads the icon characters from the trimmed assets/fonts/font-awesome.min.css
(made by tools/trim-css) and writes assets/fonts/fontawesome-subset.woff2
containing only those glyphs, from the full fontawesome-webfont.woff2.

Adding an icon: use it in a page (<i class="fa fa-NAME"></i>), re-run
tools/trim-css, then this.

usage (from the repo root):
    uv run --with fonttools --with brotli python tools/subset_icons.py
"""
import os
import re

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, "assets/fonts/font-awesome.min.css")
SOURCE = os.path.join(ROOT, "assets/fonts/fontawesome-webfont.woff2")
OUT = os.path.join(ROOT, "assets/fonts/fontawesome-subset.woff2")

css = open(CSS, encoding="utf-8").read()
codepoints = sorted({int(h, 16) for h in re.findall(r'content:\s*"\\([0-9a-fA-F]{4,5})"', css)})
print("icons:", " ".join(f"U+{c:04X}" for c in codepoints))

options = subset.Options()
options.flavor = "woff2"
options.layout_features = ["*"]
options.hinting = True          # keep hinting so icons render exactly as before
options.name_IDs = ["*"]
options.notdef_outline = True
font = subset.load_font(SOURCE, options)
subsetter = subset.Subsetter(options)
subsetter.populate(unicodes=codepoints)
subsetter.subset(font)
subset.save_font(font, OUT, options)
print(f"{os.path.getsize(SOURCE)/1024:.0f} KB -> {os.path.getsize(OUT)/1024:.1f} KB: {os.path.relpath(OUT, ROOT)}")
