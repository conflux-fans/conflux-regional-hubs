import type { RegionalConfig } from "../regional.ts";
import { getLocalArticles } from "./content.ts";

export type RegionalArticle = {
  title: string;
  url: string;
  date: string;
  excerpt?: string;
  external?: boolean;
};

function take<T>(items: T[], limit?: number) {
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function safeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function fromJson(payload: unknown, limit?: number): RegionalArticle[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "items" in payload && Array.isArray(payload.items)
      ? payload.items
      : [];

  return take(source, limit).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = cleanText(record.title);
    const url = safeUrl(record.url ?? record.link);
    if (!title || !url) return [];
    return [{ title, url, date: cleanText(record.date ?? record.publishedAt), excerpt: cleanText(record.excerpt ?? record.description), external: true }];
  });
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return cleanText(match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") ?? "");
}

function fromRss(xml: string, limit?: number): RegionalArticle[] {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  return take(items, limit).flatMap((match) => {
    const title = tag(match[0], "title");
    const url = safeUrl(tag(match[0], "link"));
    if (!title || !url) return [];
    return [{ title, url, date: tag(match[0], "pubDate"), excerpt: tag(match[0], "description"), external: true }];
  });
}

export async function getRegionalArticles(region: RegionalConfig, limit?: number): Promise<RegionalArticle[]> {
  const local = (await getLocalArticles(region.key, limit)).map((article) => ({
    title: article.title,
    url: `/journal/${article.slug}?region=${region.key}`,
    date: new Date(article.publishedAt).toLocaleDateString(region.key === "korea" ? "ko-KR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    excerpt: article.excerpt,
    external: false,
  }));
  const sourceUrl = safeUrl(region.articleSource.url);
  if (!sourceUrl) return local;

  try {
    const response = await fetch(sourceUrl, { next: { revalidate: 900 } });
    if (!response.ok) return local;
    const remote = region.articleSource.format === "rss" ? fromRss(await response.text(), limit) : fromJson(await response.json(), limit);
    return take([...local, ...remote], limit);
  } catch {
    return local;
  }
}
