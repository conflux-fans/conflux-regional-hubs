import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

async function configuredEditors() {
  const { env } = await import("cloudflare:workers");
  const raw = (env as unknown as Record<string, string | undefined>).REGIONAL_EDITOR_EMAILS ?? "";
  return raw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export async function canEdit(user: ChatGPTUser | null) {
  return Boolean(user && (await configuredEditors()).includes(user.email.toLowerCase()));
}

export async function getAuthorizedEditor() {
  const user = await getChatGPTUser();
  return await canEdit(user) ? user : null;
}
