import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "regional-hub-sqlite-"));
process.env.SQLITE_PATH = join(temporaryDirectory, "app.db");

const { closeDatabase, getDatabase } = await import("../db/index.ts");
const { getManagedArticles, getRegionalContent, saveLocalArticle, saveRegionalContent } = await import("../app/lib/content.ts");

after(async () => {
  await closeDatabase();
  await rm(temporaryDirectory, { recursive: true, force: true });
});

test("SQLite migrations create the required tables and query indexes", async () => {
  const database = await getDatabase();
  const tables = await database.all("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name");
  const names = new Set(tables.map((row) => row.name));
  for (const name of ["articles", "region_settings", "regional_briefs", "regional_content", "regional_modules", "regional_contributors", "schema_migrations"]) {
    assert.equal(names.has(name), true, `Missing table: ${name}`);
  }
  const migration = await database.get("SELECT name FROM schema_migrations WHERE name = ?", ["0001_initial.sql"]);
  assert.deepEqual(migration, { name: "0001_initial.sql" });

  const queryPlan = await database.all("EXPLAIN QUERY PLAN SELECT * FROM articles WHERE region = ? ORDER BY published_at DESC", ["africa"]);
  assert.match(queryPlan.map((row) => row.detail).join("\n"), /articles_region_published_idx/);
});

test("regional content and article drafts persist in the SQLite file", async () => {
  const initial = await getRegionalContent("africa");
  await saveRegionalContent("africa", { ...initial, headline: "Persisted SQLite headline" }, "manager@example.com");
  assert.equal((await getRegionalContent("africa")).headline, "Persisted SQLite headline");

  const saved = await saveLocalArticle("africa", {
    title: "SQLite migration test",
    excerpt: "A persisted article draft.",
    body: "This article verifies that the native SQLite database stores manager changes.",
    status: "draft",
  }, "manager@example.com");
  assert.ok(saved.id > 0);
  assert.equal((await getManagedArticles("africa"))[0]?.title, "SQLite migration test");
});
