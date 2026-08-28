import assert from "node:assert/strict";
import test from "node:test";
import { resolveStakingConfig } from "../app/lib/staking/config.ts";
import { CONFLUX_ESPACE_CHAIN_HEX, STAKING_CONTRACT_ADDRESS } from "../app/lib/staking/constants.ts";
import { discoverInjectedWallets, InjectedWalletSession } from "../app/lib/staking/provider.ts";

function fakeProvider() {
  const listeners = new Map();
  const requests = [];
  const provider = {
    requests,
    async request({ method, params }) {
      requests.push([method, params]);
      if (method === "eth_requestAccounts" || method === "eth_accounts") return ["0x0000000000000000000000000000000000000002"];
      if (method === "eth_chainId") return CONFLUX_ESPACE_CHAIN_HEX;
      if (method === "wallet_switchEthereumChain") return null;
      throw new Error(`Unexpected method: ${method}`);
    },
    on(event, listener) { listeners.set(event, listener); },
    removeListener(event) { listeners.delete(event); },
    emit(event, value) { listeners.get(event)?.(value); },
  };
  return provider;
}

test("disabled or invalid staking configuration remains fail-closed", () => {
  assert.deepEqual(resolveStakingConfig({ NEXT_PUBLIC_STAKING_ENABLED: "false" }), { enabled: false });
  const invalid = resolveStakingConfig({ NEXT_PUBLIC_STAKING_ENABLED: "true" });
  assert.equal(invalid.enabled, false);
  assert.match(invalid.configurationError, /configuration/i);

  assert.equal(resolveStakingConfig({
    NEXT_PUBLIC_STAKING_ENABLED: "true",
    NEXT_PUBLIC_CONFLUX_NETWORK: "espace-mainnet",
    NEXT_PUBLIC_CONFLUX_CHAIN_ID: "1030",
    NEXT_PUBLIC_CONFLUX_RPC_URL: "https://evm.confluxrpc.com",
    NEXT_PUBLIC_STAKING_CONTRACT: STAKING_CONTRACT_ADDRESS,
  }).enabled, true);
});

test("wallet session connects, switches network, and emits cleared state before account refresh", async () => {
  const provider = fakeProvider();
  const session = new InjectedWalletSession(provider);
  assert.deepEqual(await session.connect(), {
    account: "0x0000000000000000000000000000000000000002",
    chainId: 1030n,
  });
  await session.switchToConflux();
  assert.deepEqual(provider.requests.at(-1), ["wallet_switchEthereumChain", [{ chainId: "0x406" }]]);

  const changes = [];
  const unsubscribe = session.subscribe((change) => changes.push(change));
  provider.emit("accountsChanged", ["0x0000000000000000000000000000000000000003"]);
  provider.emit("chainChanged", "0x1");
  provider.emit("disconnect", { code: 4900 });
  unsubscribe();

  assert.deepEqual(changes, [
    { type: "accounts", account: "0x0000000000000000000000000000000000000003" },
    { type: "chain", chainId: 1n },
    { type: "disconnect" },
  ]);
});

test("Fluent remains connectable without exposing its brand name", async () => {
  const provider = fakeProvider();
  let listener;
  const target = {
    addEventListener(_type, nextListener) { listener = nextListener; },
    removeEventListener() { listener = undefined; },
    dispatchEvent() {
      listener?.({ detail: { info: { uuid: "fluent-wallet", name: "Fluent" }, provider } });
      return true;
    },
  };

  const wallets = await discoverInjectedWallets(target, 0);
  assert.equal(wallets.length, 1);
  assert.equal(wallets[0].name, "Browser wallet");
  assert.equal(wallets[0].provider, provider);
});
