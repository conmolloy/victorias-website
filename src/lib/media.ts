/**
 * Build-time details for the gallery's audio clips and Vimeo/YouTube videos,
 * with clear errors when a file the page needs is missing.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { encodePath, webpSize } from "./photos";

const publicFile = (path: string) => join(process.cwd(), "public", path);

/** An audio file in public/, checked to exist; returns src and MIME type. */
export function audioFile(path: string): { src: string; type: string } {
  if (!existsSync(publicFile(path)))
    throw new Error(
      `Audio file not found: public/${path}\n` +
        "Check the path in src/content/gallery.yaml (upper/lower case matters on the live server).",
    );
  return {
    src: path,
    type: path.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg",
  };
}

export interface VideoInput {
  title: string;
  url: string;
  player?: string | undefined;
  allow?: string | undefined;
}

export interface VideoPreview {
  title: string;
  url: string;
  /** player address, loaded (and autoplayed) when the preview is clicked */
  embed: string;
  allow: string;
  thumbnail: { src: string; width: number; height: number };
}

const VIMEO_ALLOW = "autoplay; fullscreen; picture-in-picture";
const YOUTUBE_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

/** Player address, permissions and preview image for a Vimeo/YouTube video. */
export function videoPreview(video: VideoInput): VideoPreview {
  const vimeo = video.url.match(/vimeo\.com\/(\d+)/);
  const youtube = video.url.match(/(?:[?&]v=|youtu\.be\/)([\w-]+)/);
  const [provider, id] = vimeo
    ? ["vimeo", vimeo[1]]
    : youtube
      ? ["youtube", youtube[1]]
      : [null, null];
  if (!provider || !id)
    throw new Error(`Not a Vimeo/YouTube address: ${video.url}`);

  const thumb = `assets/img/video-thumbs/${provider}-${id}.webp`;
  if (!existsSync(publicFile(thumb)))
    throw new Error(
      `No preview image for the video "${video.title}" (public/${thumb}).\n` +
        "Make it with: uv run --with pillow python tools/video_facades.py --apply",
    );

  return {
    title: video.title,
    url: video.url,
    embed:
      video.player ??
      (provider === "vimeo"
        ? `https://player.vimeo.com/video/${id}?autoplay=1`
        : `https://www.youtube.com/embed/${id}?autoplay=1`),
    allow: video.allow ?? (provider === "vimeo" ? VIMEO_ALLOW : YOUTUBE_ALLOW),
    thumbnail: { src: encodePath(thumb), ...webpSize(publicFile(thumb)) },
  };
}
