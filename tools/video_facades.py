"""Turn Vimeo/YouTube <iframe> embeds into click-to-load previews.

An embedded player downloads ~200 KB+ of scripts as soon as the page loads,
even if nobody presses play. This replaces each embed with a link showing the
video's thumbnail and a play button; assets/js/video-facade.js swaps in the
real player (autoplaying) when it's clicked. Without JavaScript the link
simply opens the video on Vimeo/YouTube.

To add a video: paste the normal embed code from Vimeo/YouTube into
src/pages/gallery.astro, then run this. Commented-out embeds are left alone; safe to re-run.

usage (from the repo root):
    uv run --with pillow python tools/video_facades.py            # dry run
    uv run --with pillow python tools/video_facades.py --apply
"""
import html
import io
import json
import os
import re
import sys
import urllib.request
from urllib.parse import quote

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = "--apply" in sys.argv
PAGES = ["../src/pages/gallery.astro"]  # relative to public/
THUMB_DIR = "assets/img/video-thumbs"
THUMB_WIDTH = 960
os.chdir(os.path.join(ROOT, "public"))  # thumbnails go to public/assets/...

IFRAME = re.compile(r"<iframe\b[^>]*>\s*</iframe>", re.I)
COMMENT = re.compile(r"<!--.*?-->", re.S)


def attr(tag, name):
    m = re.search(rf'\b{name}="([^"]*)"', tag)
    return html.unescape(m.group(1)) if m else None


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (site build script)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def video_info(src):
    """(provider, id, watch url, title, thumbnail url) for an embed src."""
    m = re.search(r"player\.vimeo\.com/video/(\d+)", src)
    if m:
        vid = m.group(1)
        d = json.loads(fetch(f"https://vimeo.com/api/oembed.json?url={quote('https://vimeo.com/' + vid, safe='')}&width=1280"))
        return "vimeo", vid, f"https://vimeo.com/{vid}", d.get("title"), d["thumbnail_url"]
    m = re.search(r"youtube(?:-nocookie)?\.com/embed/([\w-]+)", src)
    if m:
        vid = m.group(1)
        d = json.loads(fetch(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"))
        thumb = f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg"
        try:
            fetch(thumb)
        except Exception:
            thumb = d["thumbnail_url"]
        return "youtube", vid, f"https://www.youtube.com/watch?v={vid}", d.get("title"), thumb
    return None


def facade(tag):
    src = attr(tag, "src")
    info = video_info(src)
    if not info:
        return None
    provider, vid, watch, title, thumb_url = info
    title = attr(tag, "title") or title or "Video"
    height = attr(tag, "height") or "368"
    allow = attr(tag, "allow") or "autoplay; fullscreen; picture-in-picture"
    embed = src + ("&" if "?" in src else "?") + "autoplay=1"
    thumb = f"{THUMB_DIR}/{provider}-{vid}.webp"
    if APPLY and not os.path.exists(thumb):
        os.makedirs(THUMB_DIR, exist_ok=True)
        im = Image.open(io.BytesIO(fetch(thumb_url))).convert("RGB")
        if im.width > THUMB_WIDTH:
            im = im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
        im.save(thumb, "WEBP", quality=80, method=6)
    w, h = Image.open(thumb).size if os.path.exists(thumb) else (1280, 720)
    # (braces too: Astro would read {...} in the page as an expression)
    e = lambda s: html.escape(s, quote=True).replace("{", "&#123;").replace("}", "&#125;")
    return (f'<a class="video-facade" href="{e(watch)}" data-embed="{e(embed)}" data-allow="{e(allow)}" '
            f'data-height="{e(height)}" style="height: {e(height)}px" aria-label="Play video: {e(title)}">'
            f'<img src="{thumb}" alt="{e(title)}" loading="lazy" decoding="async" width="{w}" height="{h}">'
            f'<span class="video-facade-play" aria-hidden="true"></span></a>')


for page in PAGES:
    text = open(page, encoding="utf-8", newline="").read()
    # only touch embeds outside HTML comments
    parts = re.split(r"(<!--.*?-->)", text, flags=re.S)
    count = 0
    for i, part in enumerate(parts):
        if part.startswith("<!--"):
            continue

        def repl(m):
            global count
            new = facade(m.group(0))
            if new is None:
                return m.group(0)
            count += 1
            print(f"  {attr(m.group(0), 'src')[:60]} -> {attr(new, 'src')}")
            return new
        parts[i] = IFRAME.sub(repl, part)
    print(f"{page}: {count} embeds" + ("" if APPLY else " (dry run)"))
    if APPLY and count:
        open(page, "w", encoding="utf-8", newline="").write("".join(parts))
