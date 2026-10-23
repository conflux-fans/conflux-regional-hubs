import { getDatabase } from "../../db/index.ts";
import { slovoCopy } from "../slovo-copy.ts";

const SLOVO_COPY_REGION = "slovo-ui";

export async function loadSlovoCopy(): Promise<Record<string, string>> {
  try {
    const db = await getDatabase();
    const row = await db.prepare("SELECT content_json AS contentJson FROM regional_content WHERE region = ?").bind(SLOVO_COPY_REGION).first<{ contentJson: string }>();
    const saved = row?.contentJson ? JSON.parse(row.contentJson) as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(slovoCopy).map(([key, value]) => [key, typeof saved[key] === "string" ? saved[key] as string : value]));
  } catch {
    return slovoCopy;
  }
}
