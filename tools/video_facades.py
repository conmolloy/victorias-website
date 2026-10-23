"""Download the preview images for the gallery's Vimeo/YouTube videos.

The gallery shows each video (listed under `video_rows:` in
src/content/gallery.yaml) as a click-to-load preview: the video's thumbnail
with a play button; assets/js/video-facade.js swaps in the real player when
it's clicked, and without JavaScript the link opens the video on Vimeo/YouTube.
An embedded player downloads ~200 KB+ of scripts as soon as the page loads,
so this keeps the page light.

This downloads the thumbnail of every listed video that doesn't have one yet
into public/assets/img/video-thumbs/ (the build stops with a message pointing
here if one is missing). Safe to re-run.

usage (from the repo root):
    uv run --with pillow python tools/video_facades.py            # dry run
    uv run --with pillow python tools/video_facades.py --apply
"""
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
DATA = os.path.join(ROOT, "src", "content", "gallery.yaml")
THUMB_DIR = os.path.join(ROOT, "public", "assets", "img", "video-thumbs")
THUMB_WIDTH = 960
URL = re.compile(r"""^\s*url:\s*["']?(\S+?)["']?\s*(?:#.*)?$""", re.M)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (site build script)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def video(url):
    """(provider, id) for a Vimeo/YouTube address, else None."""
    m = re.search(r"vimeo\.com/(\d+)", url)
    if m:
        return "vimeo", m.group(1)
    m = re.search(r"(?:[?&]v=|youtu\.be/)([\w-]+)", url)
    if m:
        return "youtube", m.group(1)
    return None


def thumbnail_url(provider, vid):
    if provider == "vimeo":
        d = json.loads(fetch("https://vimeo.com/api/oembed.json?url="
                             + quote(f"https://vimeo.com/{vid}", safe="") + "&width=1280"))
        return d["thumbnail_url"]
    thumb = f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg"
    try:
        fetch(thumb)
        return thumb
    except Exception:
        d = json.loads(fetch(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"))
        return d["thumbnail_url"]


text = open(DATA, encoding="utf-8").read()
section = text[text.index("video_rows:"):]
urls = URL.findall(section)
todo = 0
for url in urls:
    v = video(url)
    if not v:
        print(f"  not a Vimeo/YouTube address: {url}")
        continue
    provider, vid = v
    out = os.path.join(THUMB_DIR, f"{provider}-{vid}.webp")
    if os.path.exists(out):
        continue
    todo += 1
    print(f"  {url} -> {os.path.relpath(out, ROOT)}")
    if APPLY:
        im = Image.open(io.BytesIO(fetch(thumbnail_url(provider, vid)))).convert("RGB")
        if im.width > THUMB_WIDTH:
            im = im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
        os.makedirs(THUMB_DIR, exist_ok=True)
        im.save(out, "WEBP", quality=80, method=6)

print(f"{len(urls)} videos, {todo} preview images {'downloaded' if APPLY else 'to download (dry run)'}")
