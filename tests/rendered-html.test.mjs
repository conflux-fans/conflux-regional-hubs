import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startNextTestServer } from "./next-test-server.mjs";

let directory;
let server;

test.before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "regional-hubs-next-test-"));
  server = await startNextTestServer({
    DATABASE_PATH: path.join(directory, "content.sqlite"),
    MANAGER_CREDENTIALS: JSON.stringify({
      "admin@example.com": "test-manager-password",
    }),
    MANAGER_SESSION_SECRET: "test-manager-session-signing-secret",
    NEXT_PUBLIC_REGION_SLUG: "africa",
  });
});

test.after(async () => {
  await server?.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("renders site-specific social metadata without development markers", async () => {
  const response = await fetch(`${server.origin}/`, {
    headers: { accept: "text/html" },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.doesNotMatch(html, /codex-preview/i);
  assert.match(html, /og:image/i);
  assert.match(html, /\/og\.png/i);
});

test("keeps the developer handoff page out of public navigation", async () => {
  const homeResponse = await fetch(`${server.origin}/`, {
    headers: { accept: "text/html" },
  });
  assert.equal(homeResponse.status, 200);
  assert.doesNotMatch(await homeResponse.text(), /href="\/handoff"/i);

  const handoffResponse = await fetch(`${server.origin}/handoff`, {
    headers: { accept: "text/html" },
  });
  assert.equal(handoffResponse.status, 200);
  assert.match(await handoffResponse.text(), /DEVELOPER HANDOFF/);
});

test("manager signs in and edits Journal content stored in SQLite", async () => {
  const anonymousResponse = await fetch(`${server.origin}/manager`, {
    headers: { accept: "text/html" },
    redirect: "manual",
  });
  assert.equal(anonymousResponse.status, 307);
  assert.equal(
    new URL(anonymousResponse.headers.get("location"), server.origin).pathname,
    "/manager/login",
  );

  const anonymousDrafts = await fetch(`${server.origin}/api/posts?includeDrafts=1`);
  assert.equal(anonymousDrafts.status, 401);

  const loginResponse = await fetch(`${server.origin}/api/manager/session`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "login",
      email: "admin@example.com",
      password: "test-manager-password",
      return_to: "/manager",
    }),
    redirect: "manual",
  });
  assert.equal(loginResponse.status, 303);
  const sessionCookie = loginResponse.headers.get("set-cookie");
  assert.match(sessionCookie ?? "", /manager_session=/);
  assert.match(sessionCookie ?? "", /HttpOnly/i);
  assert.match(sessionCookie ?? "", /SameSite=Lax/i);
  const cookie = sessionCookie.split(";", 1)[0];

  const managerResponse = await fetch(`${server.origin}/manager`, {
    headers: { accept: "text/html", cookie },
  });
  assert.equal(managerResponse.status, 200);
  assert.match(await managerResponse.text(), /admin@example\.com/);

  const createResponse = await fetch(`${server.origin}/api/posts`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      title: "SQLite draft",
      slug: "sqlite-draft",
      excerpt: "A persisted draft.",
      body: "## Draft body",
      tag: "BUILDERS",
      author: "Regional editor",
      status: "draft",
    }),
  });
  assert.equal(createResponse.status, 201);
  const draft = (await createResponse.json()).post;
  assert.equal(draft.status, "draft");

  const publicList = (await (await fetch(`${server.origin}/api/posts`)).json()).posts;
  assert.equal(publicList.some((post) => post.slug === "sqlite-draft"), false);
  const managerListResponse = await fetch(`${server.origin}/api/posts?includeDrafts=1`, {
    headers: { cookie },
  });
  assert.equal(managerListResponse.status, 200);
  const managerList = (await managerListResponse.json()).posts;
  assert.equal(managerList.some((post) => post.slug === "sqlite-draft"), true);

  const updateResponse = await fetch(`${server.origin}/api/posts/sqlite-draft`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      title: "Published SQLite story",
      slug: "published-sqlite-story",
      excerpt: "A persisted story.",
      body: "## Published body",
      tag: "BUILDERS",
      author: "Regional editor",
      status: "published",
    }),
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).post.slug, "published-sqlite-story");
  assert.equal((await fetch(`${server.origin}/api/posts/sqlite-draft`)).status, 404);
  assert.equal((await fetch(`${server.origin}/api/posts/published-sqlite-story`)).status, 200);
});
