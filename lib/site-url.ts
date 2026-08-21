export function siteBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function articlePath(slug: string): string {
  return `/journal/${encodeURIComponent(slug)}`;
}

export function canonicalArticleUrl(slug: string): string | null {
  const base = siteBaseUrl();
  return base ? `${base}${articlePath(slug)}` : null;
}
