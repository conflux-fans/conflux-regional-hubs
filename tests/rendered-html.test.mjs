import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Next.js production build contains the public and protected routes", async () => {
  const manifest = JSON.parse(await readFile(new URL("../.next/server/app-paths-manifest.json", import.meta.url), "utf8"));
  for (const route of ["/page", "/login/page", "/studio/page", "/api/auth/login/route", "/api/studio/route"]) {
    assert.equal(typeof manifest[route], "string", `Missing built route: ${route}`);
  }
});

test("site metadata retains the development preview marker", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /"codex-preview": "development"/);
});
