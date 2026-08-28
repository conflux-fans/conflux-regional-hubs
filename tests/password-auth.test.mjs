import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionToken,
  hashPassword,
  safeReturnTo,
  verifyPassword,
  verifySessionToken,
} from "../app/lib/auth-crypto.ts";
import { isSameOriginRequest } from "../app/lib/request-origin.ts";

test("passwords are PBKDF2-hashed and verified without storing plaintext", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.match(hash, /^pbkdf2-sha256:210000:/);
  assert.equal(hash.includes("correct horse"), false);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("signed editor sessions expire and reject tampering", async () => {
  const secret = "a secure test secret that is longer than thirty-two characters";
  const now = Date.UTC(2026, 7, 27);
  const token = await createSessionToken("Manager@Example.com", secret, now);
  assert.deepEqual(await verifySessionToken(token, secret, now), {
    email: "manager@example.com",
    expiresAt: Math.floor(now / 1000) + 43_200,
  });
  assert.equal(await verifySessionToken(`${token}x`, secret, now), null);
  assert.equal(await verifySessionToken(token, secret, now + 43_200_000), null);
});

test("login redirects stay on the current site", () => {
  assert.equal(safeReturnTo("/studio?region=africa"), "/studio?region=africa");
  assert.equal(safeReturnTo("https://attacker.example"), "/studio");
  assert.equal(safeReturnTo("//attacker.example"), "/studio");
  assert.equal(safeReturnTo("/api/auth/logout"), "/studio");
});

test("authentication accepts the public HTTPS origin forwarded by the reverse proxy", () => {
  const request = new Request("https://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: {
      origin: "https://hub.example.com",
      "x-forwarded-host": "hub.example.com",
      "x-forwarded-proto": "https",
    },
  });

  assert.equal(isSameOriginRequest(request), true);
});

test("authentication rejects malformed and cross-site origins behind the reverse proxy", () => {
  const headers = {
    "x-forwarded-host": "hub.example.com",
    "x-forwarded-proto": "https",
  };

  assert.equal(isSameOriginRequest(new Request("https://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { ...headers, origin: "not a URL" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { ...headers, origin: "https://attacker.example" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { ...headers, origin: "https://hub.example.com/path" },
  })), false);
  assert.equal(isSameOriginRequest(new Request("https://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { ...headers, origin: "https://user@hub.example.com" },
  })), false);
});
