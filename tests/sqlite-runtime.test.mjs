import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the application runs as a Node server with direct SQLite storage", async () => {
  const [packageSource, authSource, socialFeedSource, postsSource, connectionsSource, gitignore] =
    await Promise.all([
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../lib/auth.server.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/social-feed/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/posts.server.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/social-connections.server.ts", import.meta.url), "utf8"),
      readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    ]);
  const packageJson = JSON.parse(packageSource);

  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  for (const dependency of ["@cloudflare/vite-plugin", "vinext", "vite", "wrangler"]) {
    assert.equal(packageJson.devDependencies[dependency], undefined);
  }
  for (const source of [authSource, socialFeedSource, postsSource, connectionsSource]) {
    assert.doesNotMatch(source, /cloudflare:workers|D1Database/);
  }
  assert.match(postsSource, /better-sqlite3/);
  assert.match(connectionsSource, /better-sqlite3/);
  assert.match(gitignore, /^\/\.data\/$/m);
});
