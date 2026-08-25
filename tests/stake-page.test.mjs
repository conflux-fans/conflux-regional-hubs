import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startNextTestServer } from "./next-test-server.mjs";

test("stake page explains the pool and offers Fluent connection before a wallet is connected", async (testContext) => {
  const directory = await mkdtemp(path.join(tmpdir(), "regional-hubs-stake-test-"));
  const server = await startNextTestServer({
    DATABASE_PATH: path.join(directory, "content.sqlite"),
    NEXT_PUBLIC_REGION_SLUG: "africa",
  });
  testContext.after(async () => {
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  });
  const response = await fetch(`${server.origin}/stake`, {
    headers: { accept: "text/html" },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Pool overview/);
  assert.match(html, /Connect Fluent/);
  assert.match(html, /Core Space mainnet/);
  assert.match(html, /about 13 days/);
  assert.match(html, /Rewards are not fixed/);
  assert.match(
    html,
    /<a href="https:\/\/confluxscan\.org\/address\/cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0" target="_blank" rel="noreferrer" title="cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0">/,
  );
});
