const PASSWORD_SCHEME = "pbkdf2-sha256";
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_KEY_BYTES = 32;
const SESSION_VERSION = 1;
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

type SessionPayload = {
  version: number;
  email: string;
  issuedAt: number;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    PASSWORD_KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  if (password.length < 12) throw new Error("Administrator passwords must contain at least 12 characters.");
  const derived = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return [PASSWORD_SCHEME, PASSWORD_ITERATIONS, bytesToBase64Url(salt), bytesToBase64Url(derived)].join(":");
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [scheme, iterationsValue, saltValue, hashValue, extra] = encodedHash.split(":");
  const iterations = Number(iterationsValue);
  if (extra !== undefined || scheme !== PASSWORD_SCHEME || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;

  try {
    const salt = base64UrlToBytes(saltValue);
    const expected = base64UrlToBytes(hashValue);
    if (salt.length < 16 || expected.length !== PASSWORD_KEY_BYTES) return false;
    const actual = await derivePassword(password, salt, iterations);
    const key = await crypto.subtle.importKey("raw", expected, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode("password-verification"));
    const actualKey = await crypto.subtle.importKey("raw", actual, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("HMAC", actualKey, signature, encoder.encode("password-verification"));
  } catch {
    return false;
  }
}

export async function createSessionToken(email: string, secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters.");
  const issuedAt = Math.floor(now / 1000);
  const payload: SessionPayload = {
    version: SESSION_VERSION,
    email: email.trim().toLowerCase(),
    issuedAt,
    expiresAt: issuedAt + SESSION_LIFETIME_SECONDS,
  };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string, secret: string, now = Date.now()) {
  if (secret.length < 32) return null;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra !== undefined) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      base64UrlToBytes(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as Partial<SessionPayload>;
    const currentTime = Math.floor(now / 1000);
    if (
      payload.version !== SESSION_VERSION ||
      typeof payload.email !== "string" ||
      !payload.email ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.issuedAt > currentTime + 60 ||
      payload.expiresAt <= currentTime ||
      payload.expiresAt - payload.issuedAt !== SESSION_LIFETIME_SECONDS
    ) return null;

    return { email: payload.email, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export function safeReturnTo(value: unknown, fallback = "/studio") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || url.pathname === "/login" || url.pathname.startsWith("/api/auth/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
