import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DEFAULT_DATABASE_PATH = ".data/regional-hubs.sqlite";

const schema = `
CREATE TABLE IF NOT EXISTS journal_posts (
  id TEXT PRIMARY KEY NOT NULL,
  region_slug TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT 'COMMUNITY',
  author TEXT NOT NULL DEFAULT 'Regional Hub',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS journal_posts_region_slug_unique
  ON journal_posts(region_slug, slug);
CREATE INDEX IF NOT EXISTS journal_posts_region_status_idx
  ON journal_posts(region_slug, status, published_at);

CREATE TABLE IF NOT EXISTS social_connections (
  id TEXT PRIMARY KEY NOT NULL,
  region_slug TEXT NOT NULL,
  provider TEXT NOT NULL,
  profile_url TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS social_connections_region_provider_unique
  ON social_connections(region_slug, provider);
`;

type DatabaseGlobal = typeof globalThis & {
  regionalHubsDatabase?: Database.Database;
  regionalHubsDatabasePath?: string;
};

export function resolveDatabasePath(databasePath = process.env.DATABASE_PATH): string {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    databasePath || DEFAULT_DATABASE_PATH,
  );
}

export function openDatabase(databasePath: string): Database.Database {
  const resolvedPath = path.resolve(databasePath);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const database = new Database(resolvedPath);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.exec(schema);
  return database;
}

export function getDatabase(): Database.Database {
  const resolvedPath = resolveDatabasePath();
  const databaseGlobal = globalThis as DatabaseGlobal;
  if (
    !databaseGlobal.regionalHubsDatabase ||
    databaseGlobal.regionalHubsDatabasePath !== resolvedPath
  ) {
    databaseGlobal.regionalHubsDatabase?.close();
    databaseGlobal.regionalHubsDatabase = openDatabase(resolvedPath);
    databaseGlobal.regionalHubsDatabasePath = resolvedPath;
  }
  return databaseGlobal.regionalHubsDatabase;
}
