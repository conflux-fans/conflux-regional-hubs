import { getDatabase, resolveDatabasePath } from "../lib/database.server.ts";

getDatabase();
console.log(`SQLite schema ready: ${resolveDatabasePath()}`);
