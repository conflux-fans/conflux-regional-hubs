import type { RegionalModule } from "./content";

export type SocialPlatform = "instagram" | "twitter" | "youtube";

export type SocialFeedItem = {
  id: string;
  platform: SocialPlatform;
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string;
  publishedAt?: string;
  isProfileFallback?: boolean;
};

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function safeHttpUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function socialProfileUrl(platform: SocialPlatform, source: string) {
  const direct = safeHttpUrl(source);
  if (direct) return direct;
  const handle = source.trim().replace(/^@/, "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!handle) return "";
  if (platform === "instagram") return `https://www.instagram.com/${handle}/`;
  if (platform === "twitter") return `https://x.com/${handle}`;
  return `https://www.youtube.com/@${handle}`;
}

function sourceHandle(source: string) {
  const direct = safeHttpUrl(source);
  if (!direct) return source.trim().replace(/^@/, "");
  try {
    const parts = new URL(direct).pathname.split("/").filter(Boolean);
    return (parts.at(-1) || "").replace(/^@/, "");
  } catch {
    return "";
  }
}

function envValue(name: string) {
  try {
    const processValue = typeof process !== "undefined" ? process.env[name] : undefined;
    return processValue || "";
  } catch {
    return "";
  }
}

export function parseYouTubeFeed(xml: string): SocialFeedItem[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].slice(0, 6).flatMap((match, index) => {
    const block = match[1];
    const videoId = clean(block.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/i)?.[1], 100);
    const title = clean(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1], 180);
    const publishedAt = clean(block.match(/<published>([\s\S]*?)<\/published>/i)?.[1], 80);
    if (!videoId || !title) return [];
    return [{ id: `youtube-${videoId || index}`, platform: "youtube" as const, title, excerpt: "Watch on YouTube", url: `https://www.youtube.com/watch?v=${videoId}`, imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, publishedAt }];
  });
}

async function youtubeFeed(source: string) {
  const direct = safeHttpUrl(source);
  const channelId = direct?.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/)?.[1] || (/^UC[a-zA-Z0-9_-]+$/.test(source.trim()) ? source.trim() : "");
  if (!channelId) return [];
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, { next: { revalidate: 900 } });
  return response.ok ? parseYouTubeFeed(await response.text()) : [];
}

export function parseXFeed(payload: unknown, handle: string): SocialFeedItem[] {
  if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) return [];
  return payload.data.slice(0, 6).flatMap((row, index) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const id = clean(record.id, 100);
    const text = clean(record.text, 500);
    if (!id || !text) return [];
    return [{ id: `twitter-${id || index}`, platform: "twitter" as const, title: text, excerpt: `@${handle}`, url: `https://x.com/${handle}/status/${id}`, publishedAt: clean(record.created_at, 80) }];
  });
}

async function xFeed(source: string) {
  const token = envValue("X_BEARER_TOKEN");
  const handle = sourceHandle(source);
  if (!token || !handle) return [];
  const headers = { authorization: `Bearer ${token}` };
  const userResponse = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}`, { headers, next: { revalidate: 3600 } });
  if (!userResponse.ok) return [];
  const userPayload = await userResponse.json() as { data?: { id?: string } };
  if (!userPayload.data?.id) return [];
  const response = await fetch(`https://api.x.com/2/users/${encodeURIComponent(userPayload.data.id)}/tweets?max_results=6&tweet.fields=created_at`, { headers, next: { revalidate: 900 } });
  return response.ok ? parseXFeed(await response.json(), handle) : [];
}

export function parseInstagramFeed(payload: unknown): SocialFeedItem[] {
  if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) return [];
  return payload.data.slice(0, 6).flatMap((row, index) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const id = clean(record.id, 100);
    const url = safeHttpUrl(record.permalink);
    if (!id || !url) return [];
    const caption = clean(record.caption, 500) || "View this post on Instagram";
    return [{ id: `instagram-${id || index}`, platform: "instagram" as const, title: caption, excerpt: "Instagram", url, imageUrl: safeHttpUrl(record.thumbnail_url ?? record.media_url) || undefined, publishedAt: clean(record.timestamp, 80) }];
  });
}

async function instagramFeed() {
  const token = envValue("INSTAGRAM_ACCESS_TOKEN");
  if (!token) return [];
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", "id,caption,media_url,thumbnail_url,permalink,timestamp,media_type");
  url.searchParams.set("limit", "6");
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { next: { revalidate: 900 } });
  return response.ok ? parseInstagramFeed(await response.json()) : [];
}

function profileFallback(module: RegionalModule, platform: SocialPlatform): SocialFeedItem[] {
  const url = socialProfileUrl(platform, module.source);
  if (!url) return [];
  const label = platform === "twitter" ? "X" : platform[0].toUpperCase() + platform.slice(1);
  return [{ id: `${platform}-profile`, platform, title: `Follow Kudi Hub on ${label}`, excerpt: module.subtitle || `Open the official ${label} profile`, url, isProfileFallback: true }];
}

export async function getSocialFeed(module: RegionalModule): Promise<SocialFeedItem[]> {
  if (!module.enabled || !module.source || !["instagram", "twitter", "youtube"].includes(module.moduleKey)) return [];
  const platform = module.moduleKey as SocialPlatform;
  try {
    const items = platform === "instagram" ? await instagramFeed() : platform === "twitter" ? await xFeed(module.source) : await youtubeFeed(module.source);
    return items.length ? items : profileFallback(module, platform);
  } catch {
    return profileFallback(module, platform);
  }
}
