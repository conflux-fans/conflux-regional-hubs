function parsedOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parsedOriginHeader(value: string) {
  const origin = parsedOrigin(value);
  return origin === value ? origin : null;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function forwardedOrigin(request: Request) {
  const protocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const host = firstHeaderValue(request.headers.get("x-forwarded-host"));
  if ((protocol !== "http" && protocol !== "https") || !host) return null;
  return parsedOrigin(`${protocol}://${host}`);
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";

  const actualOrigin = parsedOriginHeader(origin);
  if (!actualOrigin) return false;
  const requestOrigin = parsedOrigin(request.url);
  const publicOrigin = parsedOrigin(process.env.NEXT_PUBLIC_SITE_URL?.trim() || null);
  const expectedOrigins = [requestOrigin, publicOrigin, forwardedOrigin(request)].filter((value) => value !== null);
  return expectedOrigins.includes(actualOrigin);
}
