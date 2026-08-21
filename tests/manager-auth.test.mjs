import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticateManagerCredentials,
  createManagerSessionToken,
  managerAuthConfigured,
  parseManagerCredentials,
  safeManagerReturnPath,
  verifyManagerSessionToken,
} from "../lib/manager-auth.ts";

const config = {
  credentials: {
    "admin@example.com": "a-long-development-password",
    "second@example.com": "a-different-long-password",
  },
  sessionSecret: "a-different-long-session-signing-secret",
};

test("approved manager credentials authenticate without case-sensitive email matching", async () => {
  assert.equal(managerAuthConfigured(config), true);
  assert.equal(
    await authenticateManagerCredentials(
      " Admin@Example.com ",
      "a-long-development-password",
      config,
    ),
    "admin@example.com",
  );
  assert.equal(
    await authenticateManagerCredentials(
      "unknown@example.com",
      "a-long-development-password",
      config,
    ),
    null,
  );
  assert.equal(
    await authenticateManagerCredentials("admin@example.com", "wrong-password", config),
    null,
  );
});

test("administrator credential JSON normalizes emails and rejects invalid configuration", () => {
  assert.deepEqual(
    parseManagerCredentials('{" Admin@Example.com ":"first-password"}'),
    { "admin@example.com": "first-password" },
  );
  assert.deepEqual(parseManagerCredentials("not-json"), {});
  assert.deepEqual(parseManagerCredentials('["admin@example.com"]'), {});
});

test("manager sessions are signed, expire and remain bound to configured accounts", async () => {
  const now = Date.parse("2026-08-21T08:00:00Z");
  const token = await createManagerSessionToken("admin@example.com", config.sessionSecret, now);

  assert.deepEqual(await verifyManagerSessionToken(token, config, now + 1_000), {
    email: "admin@example.com",
    expiresAt: now + 8 * 60 * 60 * 1000,
  });
  assert.equal(
    await verifyManagerSessionToken(`${token.slice(0, -1)}x`, config, now + 1_000),
    null,
  );
  assert.equal(await verifyManagerSessionToken(token, config, now + 9 * 60 * 60 * 1000), null);
  assert.equal(
    await verifyManagerSessionToken(
      token,
      { ...config, credentials: { "second@example.com": "a-different-long-password" } },
      now,
    ),
    null,
  );
});

test("manager return paths cannot redirect outside the site or loop through login", () => {
  assert.equal(safeManagerReturnPath("/manager?tab=journal"), "/manager?tab=journal");
  assert.equal(safeManagerReturnPath("https://attacker.example"), "/manager");
  assert.equal(safeManagerReturnPath("//attacker.example"), "/manager");
  assert.equal(safeManagerReturnPath("/manager/login"), "/manager");
});
