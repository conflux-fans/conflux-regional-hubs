import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { importSqliteContent } from "../lib/database-import.server.ts";
import { openDatabase } from "../lib/database.server.ts";
import { createPostStore, PostSlugConflictError } from "../lib/posts.server.ts";
import { createSocialConnectionStore } from "../lib/social-connections.server.ts";

test("Journal content persists in a local SQLite file", async (testContext) => {
  const directory = await mkdtemp(path.join(tmpdir(), "regional-hubs-sqlite-"));
  const databasePath = path.join(directory, "content.sqlite");
  const database = openDatabase(databasePath);
  testContext.after(async () => {
    database.close();
    await rm(directory, { recursive: true, force: true });
  });
  const posts = createPostStore(database);

  const draft = await posts.savePost({
    title: "A local story",
    slug: "a-local-story",
    excerpt: "Stored directly in SQLite.",
    body: "## Local content",
    tag: "BUILDERS",
    author: "Regional editor",
    status: "draft",
  });
  assert.equal(draft.status, "draft");
  assert.equal((await stat(databasePath)).isFile(), true);
  assert.equal((await posts.listPosts()).some((post) => post.id === draft.id), false);
  assert.equal((await posts.listPosts(true)).some((post) => post.id === draft.id), true);

  const published = await posts.updatePost("a-local-story", {
    title: "A published local story",
    slug: "published-local-story",
    excerpt: "Stored directly in SQLite.",
    body: "## Published content",
    tag: "BUILDERS",
    author: "Regional editor",
    status: "published",
  });
  assert.equal(published.slug, "published-local-story");
  assert.equal(await posts.getPost("a-local-story"), null);
  assert.equal((await posts.getPost("published-local-story")).title, "A published local story");
  assert.equal((await posts.listPosts(true)).filter((post) => post.id === draft.id).length, 1);
});

test("manager social connections persist in the same SQLite database", async (testContext) => {
  const directory = await mkdtemp(path.join(tmpdir(), "regional-hubs-social-sqlite-"));
  const database = openDatabase(path.join(directory, "content.sqlite"));
  testContext.after(async () => {
    database.close();
    await rm(directory, { recursive: true, force: true });
  });
  const connections = createSocialConnectionStore(database);

  await connections.saveSocialConnections([
    {
      provider: "instagram",
      label: "Instagram",
      profileUrl: "https://instagram.com/regionalhub",
      handle: "@regionalhub",
      enabled: true,
    },
    {
      provider: "x",
      label: "X",
      profileUrl: "https://x.com/regionalhub",
      handle: "@regionalhub",
      enabled: true,
    },
    {
      provider: "youtube",
      label: "YouTube",
      profileUrl: "",
      handle: "",
      enabled: false,
    },
  ]);

  const saved = await connections.listSocialConnections();
  assert.equal(saved.find((item) => item.provider === "instagram").handle, "@regionalhub");
  assert.equal(saved.find((item) => item.provider === "x").enabled, true);
  assert.equal(saved.find((item) => item.provider === "youtube").enabled, false);
});

test("a SQLite override cannot rename a built-in Journal article", async (testContext) => {
  const directory = await mkdtemp(path.join(tmpdir(), "regional-hubs-seeded-sqlite-"));
  const database = openDatabase(path.join(directory, "content.sqlite"));
  testContext.after(async () => {
    database.close();
    await rm(directory, { recursive: true, force: true });
  });
  const posts = createPostStore(database);
  const builtIn = await posts.getPost("shanghai-digital-finance");
  assert.ok(builtIn);
  await posts.updatePost(builtIn.slug, { ...builtIn, title: "Edited built-in story" });

  await assert.rejects(
    posts.updatePost(builtIn.slug, {
      ...builtIn,
      title: "Edited built-in story",
      slug: "renamed-built-in-story",
    }),
    PostSlugConflictError,
  );
  assert.equal((await posts.getPost("shanghai-digital-finance")).title, "Edited built-in story");
  assert.equal(await posts.getPost("renamed-built-in-story"), null);
});

test("existing content imports transactionally into the direct SQLite database", async (testContext) => {
  const directory = await mkdtemp(path.join(tmpdir(), "regional-hubs-import-"));
  const sourcePath = path.join(directory, "source.sqlite");
  const targetPath = path.join(directory, "target.sqlite");
  testContext.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const source = openDatabase(sourcePath);
  const sourcePosts = createPostStore(source);
  await sourcePosts.savePost({
    title: "Imported Journal story",
    slug: "imported-story",
    excerpt: "Preserved during the storage cutover.",
    body: "## Imported body",
    tag: "COMMUNITY",
    author: "Regional editor",
    status: "published",
  });
  const sourceConnections = createSocialConnectionStore(source);
  await sourceConnections.saveSocialConnections([
    {
      provider: "instagram",
      label: "Instagram",
      profileUrl: "https://instagram.com/importedhub",
      handle: "@importedhub",
      enabled: true,
    },
    { provider: "x", label: "X", profileUrl: "", handle: "", enabled: false },
    {
      provider: "youtube",
      label: "YouTube",
      profileUrl: "",
      handle: "",
      enabled: false,
    },
  ]);
  source.close();

  const imported = importSqliteContent(sourcePath, targetPath);
  assert.deepEqual(imported, { journalPosts: 1, socialConnections: 3 });

  const target = openDatabase(targetPath);
  testContext.after(() => target.close());
  assert.equal((await createPostStore(target).getPost("imported-story")).title, "Imported Journal story");
  assert.equal(
    (await createSocialConnectionStore(target).listSocialConnections()).find(
      (connection) => connection.provider === "instagram",
    ).handle,
    "@importedhub",
  );
});
