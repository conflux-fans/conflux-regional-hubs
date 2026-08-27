import { verifyPassword } from "./auth-crypto.ts";

export type AdminCredential = { email: string; passwordHash: string };

export class AuthConfigurationError extends Error {}

export function parseAdminCredentials(credentialsJson: string) {
  let credentials: unknown;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new AuthConfigurationError("ADMIN_CREDENTIALS_JSON is not valid JSON.");
  }
  if (!Array.isArray(credentials) || credentials.length === 0 || credentials.length > 20) {
    throw new AuthConfigurationError("Configure between 1 and 20 administrator credentials.");
  }

  const users = new Map<string, AdminCredential>();
  for (const value of credentials) {
    if (!value || typeof value !== "object") throw new AuthConfigurationError("Each administrator credential must be an object.");
    const record = value as Record<string, unknown>;
    const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    const passwordHash = typeof record.passwordHash === "string" ? record.passwordHash.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !passwordHash.startsWith("pbkdf2-sha256:")) {
      throw new AuthConfigurationError("Each administrator requires a valid email and PBKDF2 password hash.");
    }
    if (users.has(email)) throw new AuthConfigurationError(`Duplicate administrator email: ${email}`);
    users.set(email, { email, passwordHash });
  }
  return users;
}

export async function authenticateAdmin(users: Map<string, AdminCredential>, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const configuredUser = users.get(normalizedEmail);
  const comparisonHash = configuredUser?.passwordHash ?? users.values().next().value?.passwordHash ?? "";
  const passwordMatches = await verifyPassword(password, comparisonHash);
  return passwordMatches ? configuredUser ?? null : null;
}
