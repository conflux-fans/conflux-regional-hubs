import { getDatabase } from "../../db/index.ts";
import { caudalCopy } from "../caudal-copy.ts";

const CAUDAL_COPY_REGION = "latam-ui";

export async function loadCaudalCopy(): Promise<Record<string, string>> {
  try {
    const db = await getDatabase();
    const row = await db.prepare("SELECT content_json AS contentJson FROM regional_content WHERE region = ?").bind(CAUDAL_COPY_REGION).first<{ contentJson: string }>();
    const saved = row?.contentJson ? JSON.parse(row.contentJson) as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(caudalCopy).map(([key, value]) => [key, typeof saved[key] === "string" ? saved[key] as string : value]));
  } catch {
    return caudalCopy;
  }
}

export async function saveCaudalCopy(input: Record<string, string>, email: string) {
  const db = await getDatabase();
  await db.prepare(`INSERT INTO regional_content (region, content_json, updated_by, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(region) DO UPDATE SET content_json = excluded.content_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(CAUDAL_COPY_REGION, JSON.stringify(input), email, Date.now()).run();
}
