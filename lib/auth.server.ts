import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  authenticateManagerCredentials,
  createManagerSessionToken,
  managerAuthConfigured,
  parseManagerCredentials,
  safeManagerReturnPath,
  verifyManagerSessionToken,
  type ManagerAuthConfig,
} from "./manager-auth";

export const MANAGER_SESSION_COOKIE = "manager_session";

export type ManagerUser = {
  email: string;
};

export async function getManagerAuthConfig(): Promise<ManagerAuthConfig> {
  return {
    credentials: parseManagerCredentials(await runtimeValue("MANAGER_CREDENTIALS")),
    sessionSecret: await runtimeValue("MANAGER_SESSION_SECRET"),
  };
}

export async function isManagerAuthConfigured(): Promise<boolean> {
  return managerAuthConfigured(await getManagerAuthConfig());
}

export async function authenticateManager(
  email: string,
  password: string,
): Promise<string | null> {
  return authenticateManagerCredentials(email, password, await getManagerAuthConfig());
}

export async function issueManagerSession(email: string): Promise<string> {
  const config = await getManagerAuthConfig();
  return createManagerSessionToken(email, config.sessionSecret);
}

export async function getManagerUser(): Promise<ManagerUser | null> {
  const token = (await cookies()).get(MANAGER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifyManagerSessionToken(token, await getManagerAuthConfig());
  return session ? { email: session.email } : null;
}

export async function requireManagerUser(returnTo: string): Promise<ManagerUser> {
  const user = await getManagerUser();
  if (user) return user;

  const safeReturnTo = safeManagerReturnPath(returnTo);
  redirect(`/manager/login?return_to=${encodeURIComponent(safeReturnTo)}`);
}

export async function canManage(): Promise<boolean> {
  return Boolean(await getManagerUser());
}

async function runtimeValue(name: keyof NodeJS.ProcessEnv): Promise<string> {
  return process.env[name] ?? "";
}
