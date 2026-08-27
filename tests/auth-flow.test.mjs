import assert from "node:assert/strict";
import test from "node:test";
import { authenticateAdmin, AuthConfigurationError, parseAdminCredentials } from "../app/lib/admin-credentials.ts";
import { hashPassword } from "../app/lib/auth-crypto.ts";

test("multiple configured administrators authenticate only with their own password", async () => {
  const firstPassword = "correct horse battery staple";
  const secondPassword = "another secure manager password";
  const users = parseAdminCredentials(JSON.stringify([
    { email: "Manager@Example.com", passwordHash: await hashPassword(firstPassword) },
    { email: "editor@example.com", passwordHash: await hashPassword(secondPassword) },
  ]));

  assert.equal((await authenticateAdmin(users, "manager@example.com", firstPassword))?.email, "manager@example.com");
  assert.equal((await authenticateAdmin(users, "EDITOR@example.com", secondPassword))?.email, "editor@example.com");
  assert.equal(await authenticateAdmin(users, "manager@example.com", secondPassword), null);
  assert.equal(await authenticateAdmin(users, "unknown@example.com", firstPassword), null);
});

test("administrator configuration rejects duplicates and malformed lists", async () => {
  const passwordHash = await hashPassword("correct horse battery staple");
  assert.throws(() => parseAdminCredentials("not json"), AuthConfigurationError);
  assert.throws(() => parseAdminCredentials("[]"), AuthConfigurationError);
  assert.throws(() => parseAdminCredentials(JSON.stringify([
    { email: "manager@example.com", passwordHash },
    { email: "MANAGER@example.com", passwordHash },
  ])), /Duplicate administrator email/);
});
