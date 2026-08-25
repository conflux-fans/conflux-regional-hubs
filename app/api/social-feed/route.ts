import { NextResponse } from "next/server";
import { region, type SocialProvider } from "../../../config/regions";
import {
  normalizeInstagram,
  normalizeX,
  normalizeYouTube,
  type SocialItem,
} from "../../../lib/social";
import { listSocialConnections } from "../../../lib/social-connections.server";

type RuntimeEnv = {
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_USER_ID?: string;
  X_BEARER_TOKEN?: string;
  X_USER_ID?: string;
  YOUTUBE_API_KEY?: string;
  YOUTUBE_CHANNEL_ID?: string;
};

async function readJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json();
}

export async function GET() {
  const runtime = process.env as RuntimeEnv;
  const items: SocialItem[] = [];
  const connected: Record<SocialProvider, boolean> = {
    instagram: false,
    x: false,
    youtube: false,
  };
  const configured: Record<SocialProvider, boolean> = {
    instagram: Boolean(runtime.INSTAGRAM_ACCESS_TOKEN && runtime.INSTAGRAM_USER_ID),
    x: Boolean(runtime.X_BEARER_TOKEN && runtime.X_USER_ID),
    youtube: Boolean(runtime.YOUTUBE_API_KEY && runtime.YOUTUBE_CHANNEL_ID),
  };
  const errors: Partial<Record<SocialProvider, string>> = {};
  const saved = await listSocialConnections();
  const profiles = Object.fromEntries(
    saved.map((connection) => [
      connection.provider,
      {
        label: connection.label,
        profileUrl: connection.enabled ? connection.profileUrl : "",
        handle: connection.handle,
      },
    ]),
  );

  await Promise.all([
    (async () => {
      if (!configured.instagram) {
        errors.instagram = "API credentials not configured.";
        return;
      }
      try {
        const fields = "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url";
        const payload = await readJson(
          `https://graph.instagram.com/${encodeURIComponent(runtime.INSTAGRAM_USER_ID!)}/media?fields=${fields}&limit=6&access_token=${encodeURIComponent(runtime.INSTAGRAM_ACCESS_TOKEN!)}`,
        );
        items.push(...normalizeInstagram(payload));
        connected.instagram = true;
      } catch {
        errors.instagram = "Configured, but Instagram rejected or timed out on the request.";
      }
    })(),
    (async () => {
      if (!configured.x) {
        errors.x = "API credentials not configured.";
        return;
      }
      try {
        const payload = await readJson(
          `https://api.x.com/2/users/${encodeURIComponent(runtime.X_USER_ID!)}/tweets?max_results=10&tweet.fields=created_at`,
          { Authorization: `Bearer ${runtime.X_BEARER_TOKEN}` },
        );
        items.push(...normalizeX(payload, profiles.x?.profileUrl || region.socials.x.profileUrl));
        connected.x = true;
      } catch {
        errors.x = "Configured, but X rejected or timed out on the request.";
      }
    })(),
    (async () => {
      if (!configured.youtube) {
        errors.youtube = "API credentials not configured.";
        return;
      }
      try {
        const payload = await readJson(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(runtime.YOUTUBE_CHANNEL_ID!)}&order=date&type=video&maxResults=6&key=${encodeURIComponent(runtime.YOUTUBE_API_KEY!)}`,
        );
        items.push(...normalizeYouTube(payload));
        connected.youtube = true;
      } catch {
        errors.youtube = "Configured, but YouTube rejected or timed out on the request.";
      }
    })(),
  ]);

  items.sort(
    (a, b) => Date.parse(b.publishedAt || "0") - Date.parse(a.publishedAt || "0"),
  );
  return NextResponse.json(
    { items: items.slice(0, 12), connected, configured, errors, profiles },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
