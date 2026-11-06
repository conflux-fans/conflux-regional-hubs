export type VideoEmbed = {
  provider: "youtube" | "vimeo" | "bilibili" | "rutube" | "vk";
  url: string;
};

function id(value: string, min = 4, max = 32) {
  return new RegExp(`^[A-Za-z0-9_-]{${min},${max}}$`).test(value);
}

/**
 * Maps a whitelisted video page URL to its embeddable player URL.
 * Returns null for anything else so the renderer can fall back to a plain link.
 */
export function videoEmbedUrl(raw: string): VideoEmbed | null {
  const trimmed = raw.trim();
  if (!/^https:\/\//.test(trimmed) && !/^http:\/\//.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (segments[0] === "watch") {
      const v = url.searchParams.get("v") ?? "";
      if (id(v, 6, 20)) return { provider: "youtube", url: `https://www.youtube-nocookie.com/embed/${v}` };
    }
    if (segments[0] === "shorts" && id(segments[1] ?? "", 6, 20)) {
      return { provider: "youtube", url: `https://www.youtube-nocookie.com/embed/${segments[1]}` };
    }
    if (segments[0] === "embed" && id(segments[1] ?? "", 6, 20)) {
      return { provider: "youtube", url: `https://www.youtube-nocookie.com/embed/${segments[1]}` };
    }
    return null;
  }
  if (host === "youtu.be" && id(segments[0] ?? "", 6, 20)) {
    return { provider: "youtube", url: `https://www.youtube-nocookie.com/embed/${segments[0]}` };
  }

  if (host === "vimeo.com" && /^\d{4,12}$/.test(segments[0] ?? "")) {
    return { provider: "vimeo", url: `https://player.vimeo.com/video/${segments[0]}` };
  }

  if (host === "bilibili.com" && segments[0] === "video" && /^BV[A-Za-z0-9]{8,12}$/.test(segments[1] ?? "")) {
    return { provider: "bilibili", url: `https://player.bilibili.com/player.html?bvid=${segments[1]}&autoplay=0` };
  }

  if (host === "rutube.ru" && segments[0] === "video" && /^[A-Za-z0-9]{8,40}$/.test(segments[1] ?? "")) {
    return { provider: "rutube", url: `https://rutube.ru/play/embed/${segments[1]}` };
  }

  // vk.com/video-123_456 / vkvideo.ru/video-123_456 → canonical player URL
  const vk = (host === "vk.com" || host === "vkvideo.ru") ? (url.pathname.match(/^\/video(-?\d+)_(\d+)/) ?? null) : null;
  if (vk) return { provider: "vk", url: `https://vk.com/video_ext.php?oid=${vk[1]}&id=${vk[2]}&hd=2` };
  if (host === "vk.com" && url.pathname === "/video_ext.php") {
    const oid = url.searchParams.get("oid") ?? "";
    const vid = url.searchParams.get("id") ?? "";
    if (/^-?\d{1,20}$/.test(oid) && /^\d{1,20}$/.test(vid)) {
      return { provider: "vk", url: `https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2` };
    }
  }

  return null;
}
