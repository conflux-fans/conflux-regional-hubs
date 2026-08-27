import { headers } from "next/headers";
import { createSessionToken, verifySessionToken } from "./auth-crypto";
import { authenticateAdmin, AuthConfigurationError, parseAdminCredentials, type AdminCredential } from "./admin-credentials";

export { AuthConfigurationError } from "./admin-credentials";

export const EDITOR_SESSION_COOKIE = "regional_editor_session";
export const EDITOR_SESSION_MAX_AGE = 60 * 60 * 12;

export type EditorUser = {
  email: string;
  displayName: string;
};

type AuthConfiguration = {
  users: Map<string, AdminCredential>;
  sessionSecret: string;
};

async function authConfiguration(): Promise<AuthConfiguration> {
  const values = process.env as Record<string, string | undefined>;
  const credentialsJson = values.ADMIN_CREDENTIALS_JSON?.trim() ?? "";
  const sessionSecret = values.AUTH_SESSION_SECRET?.trim() ?? "";

  if (!credentialsJson || sessionSecret.length < 32) {
    throw new AuthConfigurationError("Administrator authentication is not configured.");
  }

  return { users: parseAdminCredentials(credentialsJson), sessionSecret };
}

export async function authenticateEditor(email: string, password: string): Promise<EditorUser | null> {
  const configuration = await authConfiguration();
  const configuredUser = await authenticateAdmin(configuration.users, email, password);
  if (!configuredUser) return null;
  return { email: configuredUser.email, displayName: configuredUser.email };
}

export async function createEditorSession(editor: EditorUser) {
  const configuration = await authConfiguration();
  if (!configuration.users.has(editor.email)) throw new AuthConfigurationError("Administrator account is not configured.");
  return createSessionToken(editor.email, configuration.sessionSecret);
}

export async function getAuthorizedEditor(): Promise<EditorUser | null> {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const token = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${EDITOR_SESSION_COOKIE}=`))?.slice(EDITOR_SESSION_COOKIE.length + 1);
  if (!token) return null;

  let configuration: AuthConfiguration;
  try {
    configuration = await authConfiguration();
  } catch (error) {
    if (error instanceof AuthConfigurationError) return null;
    throw error;
  }
  const session = await verifySessionToken(token, configuration.sessionSecret);
  const configuredUser = session ? configuration.users.get(session.email) : null;
  if (!configuredUser) return null;
  return { email: configuredUser.email, displayName: configuredUser.email };
}

export function editorSessionCookie(token: string, secure: boolean) {
  return {
    name: EDITOR_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: EDITOR_SESSION_MAX_AGE,
  };
}

export function expiredEditorSessionCookie(secure: boolean) {
  return { ...editorSessionCookie("", secure), maxAge: 0 };
}
