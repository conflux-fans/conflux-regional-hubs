import { importSqliteContent } from "../lib/database-import.server.ts";
import { resolveDatabasePath } from "../lib/database.server.ts";

const sourceFile = process.argv[2];
if (!sourceFile) {
  throw new Error("Usage: npm run db:import -- /path/to/source.sqlite-or-export.sql");
}

const imported = importSqliteContent(sourceFile);
console.log(
  `Imported ${imported.journalPosts} Journal posts and ${imported.socialConnections} social connections into ${resolveDatabasePath()}`,
);
