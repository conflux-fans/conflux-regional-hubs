export type ManagerAuthConfig = {
  credentials: Record<string, string>;
  sessionSecret: string;
};

export type ManagerSession = {
  email: string;
  expiresAt: number;
};

export const MANAGER_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export function managerAuthConfigured(config: ManagerAuthConfig): boolean {
  return Boolean(Object.keys(config.credentials).length && config.sessionSecret);
}

export function parseManagerCredentials(value: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed)
      .filter((entry): entry is [string, string] => (
        Boolean(entry[0].trim()) && typeof entry[1] === "string" && Boolean(entry[1])
      ))
      .map(([email, password]) => [email.trim().toLowerCase(), password]),
  );
}

export async function authenticateManagerCredentials(
  email: string,
  password: string,
  config: ManagerAuthConfig,
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const expectedPassword = config.credentials[normalizedEmail] ?? "";
  const passwordMatches = await secureTextEqual(password, expectedPassword);

  return managerAuthConfigured(config) && Boolean(expectedPassword) && passwordMatches
    ? normalizedEmail
    : null;
}

export async function createManagerSessionToken(
  email: string,
  sessionSecret: string,
  now = Date.now(),
): Promise<string> {
  const payload = encodeBase64Url(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      expiresAt: now + MANAGER_SESSION_MAX_AGE_SECONDS * 1000,
    } satisfies ManagerSession),
  );
  const signature = await sign(payload, sessionSecret);
  return `${payload}.${signature}`;
}

export async function verifyManagerSessionToken(
  token: string,
  config: ManagerAuthConfig,
  now = Date.now(),
): Promise<ManagerSession | null> {
  if (!managerAuthConfigured(config)) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;

  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  const expectedSignature = await sign(payload, config.sessionSecret);
  if (!(await secureTextEqual(suppliedSignature, expectedSignature))) return null;

  let session: ManagerSession;
  try {
    session = JSON.parse(decodeBase64Url(payload)) as ManagerSession;
  } catch {
    return null;
  }

  const email = typeof session.email === "string" ? session.email.toLowerCase() : "";
  if (
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= now ||
    !config.credentials[email]
  ) {
    return null;
  }

  return { email, expiresAt: session.expiresAt };
}

export function safeManagerReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/manager";

  try {
    const url = new URL(value, "https://manager.local");
    if (url.origin !== "https://manager.local" || url.pathname === "/manager/login") {
      return "/manager";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/manager";
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function secureTextEqual(first: string, second: string): Promise<boolean> {
  const [firstDigest, secondDigest] = await Promise.all([first, second].map(async (value) => (
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))
  )));
  let difference = 0;
  for (let index = 0; index < firstDigest.length; index += 1) {
    difference |= firstDigest[index] ^ secondDigest[index];
  }
  return difference === 0;
}

function encodeBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}
