import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("staking amount fields expose accessible validation relationships", async () => {
  const source = await readFile(new URL("../app/stake/stake-client.tsx", import.meta.url), "utf8");
  assert.match(source, /id="stake-amount"[^>]+aria-describedby="stake-amount-error"[^>]+aria-invalid=/);
  assert.match(source, /id="unstake-amount"[^>]+aria-describedby="unstake-amount-error"[^>]+aria-invalid=/);
  assert.match(source, /id="stake-amount-error"[^>]+role="alert"/);
  assert.match(source, /id="unstake-amount-error"[^>]+role="alert"/);
});

test("staking layout keeps a narrow-screen responsive breakpoint", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /\.stake-actions\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test("wallet connection opens a connector modal instead of rendering a select", async () => {
  const client = await readFile(new URL("../app/stake/stake-client.tsx", import.meta.url), "utf8");
  const modal = await readFile(new URL("../app/stake/wallet-modal.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /<select/);
  assert.match(client, /useConnect\(/);
  assert.match(client, /<WalletModal/);
  assert.match(modal, /<dialog/);
  assert.match(modal, /connectors\.map/);
});

test("wallet connection errors have only one active announcement", async () => {
  const client = await readFile(new URL("../app/stake/stake-client.tsx", import.meta.url), "utf8");
  assert.match(client, /walletMessage && !walletModalOpen && <output role="alert">/);
});
