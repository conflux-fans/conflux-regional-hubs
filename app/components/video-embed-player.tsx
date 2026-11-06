"use client";

import ReactPlayer from "react-player";
import { videoEmbedUrl } from "../lib/video-embed";

/**
 * Presents a whitelisted video link: react-player for the platforms it covers
 * (YouTube, Vimeo), provider iframe for the ones it does not (Bilibili, RuTube, VK).
 */
export function VideoEmbedPlayer({ url }: { url: string }) {
  const embed = videoEmbedUrl(url);
  if (!embed) return null;

  if (embed.provider === "youtube" || embed.provider === "vimeo") {
    return (
      <div className="video-embed">
        <ReactPlayer src={url} controls width="100%" height="100%" style={{ position: "absolute", inset: 0 }} />
      </div>
    );
  }

  return (
    <div className="video-embed">
      <iframe
        src={embed.url}
        title="Embedded video"
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      />
    </div>
  );
}
