import { closeDatabase, getDatabase } from "../db/index.ts";

try {
  const database = await getDatabase();
  const version = await database.get<{ version: string }>("SELECT sqlite_version() AS version");
  const migrations = await database.get<{ count: number }>("SELECT COUNT(*) AS count FROM schema_migrations");
  console.log(`SQLite ${version?.version ?? "unknown"}: ${migrations?.count ?? 0} migration(s) applied.`);
} finally {
  await closeDatabase();
}
