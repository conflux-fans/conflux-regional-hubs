import assert from "node:assert/strict";
import test from "node:test";

test("stake page explains the pool and offers Fluent connection before a wallet is connected", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("stake-page-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/stake", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
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
