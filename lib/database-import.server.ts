import { readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { openDatabase, resolveDatabasePath } from "./database.server.ts";

type ImportCounts = {
  journalPosts: number;
  socialConnections: number;
};

type ImportRow = Record<string, string | number | null>;

function openImportSource(sourcePath: string): Database.Database {
  if (path.extname(sourcePath).toLowerCase() === ".sql") {
    const source = new Database(":memory:");
    source.exec(readFileSync(sourcePath, "utf8"));
    return source;
  }
  return new Database(sourcePath, { readonly: true, fileMustExist: true });
}

function hasTable(database: Database.Database, table: string): boolean {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

export function importSqliteContent(
  sourceFile: string,
  targetFile = resolveDatabasePath(),
): ImportCounts {
  const sourcePath = path.resolve(sourceFile);
  const targetPath = path.resolve(targetFile);
  if (sourcePath === targetPath) {
    throw new Error("The import source and DATABASE_PATH must be different files.");
  }

  const source = openImportSource(sourcePath);
  const target = openDatabase(targetPath);
  try {
    const hasJournalPosts = hasTable(source, "journal_posts");
    const hasSocialConnections = hasTable(source, "social_connections");
    if (!hasJournalPosts && !hasSocialConnections) {
      throw new Error("The import source has no journal_posts or social_connections table.");
    }

    const journalPosts = hasJournalPosts
      ? (source.prepare("SELECT * FROM journal_posts").all() as ImportRow[])
      : [];
    const socialConnections = hasSocialConnections
      ? (source.prepare("SELECT * FROM social_connections").all() as ImportRow[])
      : [];

    const importJournalPost = target.prepare(`
      INSERT INTO journal_posts (
        id, region_slug, slug, title, excerpt, body, tag, author, status,
        published_at, created_at, updated_at
      ) VALUES (
        @id, @region_slug, @slug, @title, @excerpt, @body, @tag, @author, @status,
        @published_at, @created_at, @updated_at
      )
      ON CONFLICT(region_slug, slug) DO UPDATE SET
        title = excluded.title,
        excerpt = excluded.excerpt,
        body = excluded.body,
        tag = excluded.tag,
        author = excluded.author,
        status = excluded.status,
        published_at = excluded.published_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `);
    const importSocialConnection = target.prepare(`
      INSERT INTO social_connections (
        id, region_slug, provider, profile_url, handle, enabled, updated_at
      ) VALUES (
        @id, @region_slug, @provider, @profile_url, @handle, @enabled, @updated_at
      )
      ON CONFLICT(region_slug, provider) DO UPDATE SET
        profile_url = excluded.profile_url,
        handle = excluded.handle,
        enabled = excluded.enabled,
        updated_at = excluded.updated_at
    `);

    target.transaction(() => {
      for (const row of journalPosts) importJournalPost.run(row);
      for (const row of socialConnections) importSocialConnection.run(row);
    })();

    return {
      journalPosts: journalPosts.length,
      socialConnections: socialConnections.length,
    };
  } finally {
    source.close();
    target.close();
  }
}
