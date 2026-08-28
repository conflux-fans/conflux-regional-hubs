import assert from "node:assert/strict";
import test from "node:test";
import { readyWalletConnection } from "../app/lib/staking/wallet-connector.ts";

test("persisted connector metadata is not treated as a ready wallet during hydration", () => {
  const persistedConnector = { id: "io.fluent", name: "Fluent Wallet", type: "injected", uid: "persisted" };
  assert.equal(readyWalletConnection({
    status: "reconnecting",
    address: "0x0000000000000000000000000000000000000001",
    chainId: 1030,
    connector: persistedConnector,
  }), null);
  assert.equal(readyWalletConnection({
    status: "connected",
    address: "0x0000000000000000000000000000000000000001",
    chainId: 1030,
    connector: persistedConnector,
  }), null);
});

test("a connected runtime connector is exposed to the staking adapter", () => {
  const connector = { getProvider: async () => ({ request: async () => null }) };
  assert.deepEqual(readyWalletConnection({
    status: "connected",
    address: "0x0000000000000000000000000000000000000001",
    chainId: 1030,
    connector,
  }), {
    account: "0x0000000000000000000000000000000000000001",
    chainId: 1030n,
    connector,
  });
});
